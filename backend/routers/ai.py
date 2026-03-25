from fastapi import APIRouter, Body, File, UploadFile, Form
from typing import Any, Dict, List, Optional
import logging
import json

from google.genai import types

from ..schemas.common import APIResponse
from ..services.gemini_service import gemini_service, QuotaExceededError
from ..services.agent_service import agent_service
from ..services.email_service import email_service
from ..services.data_masking import masker
from ..config import settings

router = APIRouter()
logger = logging.getLogger(__name__)


# ──────────────────────────────────────────
# Model Config
# ──────────────────────────────────────────

@router.get("/model")
async def get_model():
    """Get current Gemini model and available models."""
    return APIResponse(success=True, data={
        "current": settings.GEMINI_MODEL,
        "available": settings.GEMINI_AVAILABLE_MODELS,
    })


@router.put("/model")
async def set_model(payload: Dict[str, Any] = Body(...)):
    """Switch Gemini model at runtime."""
    model = payload.get("model", "")
    if model not in settings.GEMINI_AVAILABLE_MODELS:
        return APIResponse(
            success=False,
            error={"code": "INVALID_MODEL", "message": f"Model ไม่ถูกต้อง เลือกได้: {', '.join(settings.GEMINI_AVAILABLE_MODELS)}"}
        )
    settings.GEMINI_MODEL = model
    # Reset client so next call picks up new model
    gemini_service._client = None
    logger.info(f"Switched Gemini model to: {model}")
    return APIResponse(success=True, data={"current": model})


# ──────────────────────────────────────────
# Phase 1: Smart Insight Summary
# ──────────────────────────────────────────

@router.post("/insights")
async def generate_insights(payload: Dict[str, Any] = Body(...)):
    """
    Receive KPI + dashboard data, ask Gemini to summarize insights in Thai.
    """
    kpi = payload.get("kpi", {})
    top_products = payload.get("top_products", [])
    by_customer = payload.get("by_customer", [])
    monthly_ts = payload.get("monthly_ts", [])

    # Build a concise data summary for the prompt
    data_summary = _build_data_summary(kpi, top_products, by_customer, monthly_ts)

    prompt = f"""คุณเป็นนักวิเคราะห์ข้อมูลยอดขายมืออาชีพของบริษัท FMCG
คุณได้รับข้อมูลสรุป KPI ยอดขายดังนี้:

{data_summary}

กรุณาวิเคราะห์และสรุป insight เป็นภาษาไทย โดย:
1. สรุปภาพรวมสั้นๆ 1 ประโยค
2. ระบุจุดเด่น/จุดที่น่าสนใจ 2-3 ข้อ
3. ให้คำแนะนำเชิง action 1-2 ข้อ

ตอบเป็น bullet points สั้นกระชับ ไม่เกิน 6 ข้อรวม ใช้ภาษาที่เข้าใจง่าย
ห้ามใส่ markdown heading (#) ให้ใช้ bullet point (•) แทน"""

    try:
        result = await gemini_service.generate(prompt, max_tokens=800)
    except QuotaExceededError as e:
        return APIResponse(
            success=False,
            error={"code": "QUOTA_EXCEEDED", "message": f"Gemini API โควต้าหมด กรุณารอ {e.retry_after:.0f} วินาทีแล้วลองใหม่", "retry_after": e.retry_after}
        )

    if result is None:
        return APIResponse(
            success=False,
            error={"code": "GEMINI_ERROR", "message": "ไม่สามารถสร้าง insight ได้ในขณะนี้"}
        )

    return APIResponse(success=True, data={"insight": result})


# ──────────────────────────────────────────
# Phase 2: AI Chat Assistant
# ──────────────────────────────────────────

_chat_system_prompt = """คุณเป็น AI Sales Assistant ของบริษัท FMCG
คุณมีหน้าที่ช่วยวิเคราะห์ข้อมูลยอดขาย ตอบคำถามเกี่ยวกับ KPI, แนวโน้มยอดขาย, สินค้า, ลูกค้า และให้คำแนะนำเชิงธุรกิจ

แหล่งข้อมูล:
- คุณอาจได้รับ "ข้อมูลยอดขาย" (Dashboard KPI) และ/หรือ "เอกสารอ้างอิงจากผู้ใช้" (Knowledge Sources)
- ถ้ามีข้อมูลยอดขาย ให้อ้างอิงตัวเลขจริงและวิเคราะห์เชิงลึก
- ถ้ามีเอกสารอ้างอิงจากผู้ใช้ ให้ใช้ข้อมูลจากเอกสารประกอบการตอบ และระบุว่าข้อมูลมาจากเอกสาร
- ถ้ามีทั้งสองแหล่ง ให้วิเคราะห์ร่วมกัน เปรียบเทียบ หรือเสริมกันตามความเหมาะสม
- ถ้าคำถามเกี่ยวกับเอกสาร แต่เอกสารไม่มีข้อมูลที่ถาม ให้บอกตรงๆ ว่า "ไม่พบข้อมูลนี้ในเอกสาร"
- ถ้าไม่มีข้อมูลเพียงพอจากทั้งสองแหล่ง ให้บอกตรงๆ

กฎสำคัญ:
- ตอบเป็นภาษาไทย ยกเว้นศัพท์เทคนิค
- ตอบอย่างละเอียดและครบถ้วน อธิบายให้เข้าใจง่าย
- ใช้ bullet points (•) และหัวข้อย่อยเพื่อจัดระเบียบคำตอบ
- ใช้ตัวเลข สถิติ และตัวอย่างประกอบเมื่อเป็นไปได้"""


@router.get("/prompt")
async def get_prompt():
    """Get current chat system prompt."""
    return APIResponse(success=True, data={"prompt": _chat_system_prompt})


@router.put("/prompt")
async def set_prompt(payload: Dict[str, Any] = Body(...)):
    """Update chat system prompt at runtime."""
    global _chat_system_prompt
    new_prompt = payload.get("prompt", "").strip()
    if not new_prompt:
        return APIResponse(
            success=False,
            error={"code": "EMPTY_PROMPT", "message": "Prompt ต้องไม่ว่าง"}
        )
    _chat_system_prompt = new_prompt
    logger.info(f"Chat system prompt updated ({len(new_prompt)} chars)")
    return APIResponse(success=True, data={"prompt": _chat_system_prompt})


@router.get("/agent/prompt")
async def get_agent_prompt():
    """Get current agent system prompt."""
    from ..services.agent_service import _agent_system_prompt
    return APIResponse(success=True, data={"prompt": _agent_system_prompt})


@router.put("/agent/prompt")
async def set_agent_prompt(payload: Dict[str, Any] = Body(...)):
    """Update agent system prompt at runtime."""
    import backend.services.agent_service as agent_mod
    new_prompt = payload.get("prompt", "").strip()
    if not new_prompt:
        return APIResponse(
            success=False,
            error={"code": "EMPTY_PROMPT", "message": "Prompt ต้องไม่ว่าง"}
        )
    agent_mod._agent_system_prompt = new_prompt
    logger.info(f"Agent system prompt updated ({len(new_prompt)} chars)")
    return APIResponse(success=True, data={"prompt": agent_mod._agent_system_prompt})


@router.post("/chat")
async def chat(payload: Dict[str, Any] = Body(...)):
    """
    Multi-turn chat with optional data context.
    Expects: { messages: [{role, content}], context?: {...} }
    """
    messages = payload.get("messages", [])
    context = payload.get("context")

    if not messages:
        return APIResponse(
            success=False,
            error={"code": "NO_MESSAGES", "message": "กรุณาส่งข้อความ"}
        )

    knowledge_doc_ids = payload.get("knowledge_doc_ids", [])

    # If context data is provided, prepend it as a system-like user message
    system = _chat_system_prompt
    if context:
        data_summary = _build_data_summary(
            context.get("kpi", {}),
            context.get("top_products", []),
            context.get("by_customer", []),
            context.get("monthly_ts", []),
            analytics=context.get("analytics"),
            deep_dive=context.get("deep_dive"),
        )
        system += f"\n\nข้อมูลยอดขายปัจจุบัน:\n{data_summary}"

    # Append knowledge documents if provided
    if knowledge_doc_ids:
        knowledge_parts = []
        for doc_id in knowledge_doc_ids:
            if doc_id in _rag_documents:
                knowledge_parts.append(_rag_documents[doc_id][:15000])
        if knowledge_parts:
            system += "\n\n=== เอกสารอ้างอิงจากผู้ใช้ ===\n" + "\n\n---\n\n".join(knowledge_parts)

    try:
        result = await gemini_service.chat(
            messages=messages,
            system_prompt=system,
            max_tokens=4096,
        )
    except QuotaExceededError as e:
        return APIResponse(
            success=False,
            error={"code": "QUOTA_EXCEEDED", "message": f"Gemini API โควต้าหมด กรุณารอ {e.retry_after:.0f} วินาทีแล้วลองใหม่", "retry_after": e.retry_after}
        )

    if result is None:
        return APIResponse(
            success=False,
            error={"code": "GEMINI_ERROR", "message": "ไม่สามารถตอบได้ในขณะนี้"}
        )

    return APIResponse(success=True, data={"reply": result})


# ──────────────────────────────────────────
# Phase 3: Report Generation + Email
# ──────────────────────────────────────────

REPORT_PROMPT_TEMPLATE = """คุณเป็นนักวิเคราะห์ข้อมูลยอดขายอาวุโสของบริษัท FMCG
คุณได้รับข้อมูลสรุปยอดขายดังนี้:

{data_summary}

กรุณาสร้างรายงานสรุปยอดขาย (Sales Report) เป็นภาษาไทย ประกอบด้วย:

=== สรุปภาพรวม ===
สรุปสถานการณ์ยอดขายภาพรวม 2-3 ประโยค

=== จุดเด่นและข้อสังเกต ===
• จุดเด่น 3-4 ข้อ พร้อมอ้างอิงตัวเลข

=== สินค้าและลูกค้า ===
• วิเคราะห์สินค้าขายดี/ขายไม่ดี
• วิเคราะห์ลูกค้าสำคัญ

=== คำแนะนำเชิงกลยุทธ์ ===
• แนะนำ action items 2-3 ข้อ

ใช้ภาษาเป็นทางการแต่อ่านง่าย เหมาะสำหรับส่งให้ผู้บริหาร
ห้ามใส่ markdown heading (#) ให้ใช้ === หัวข้อ === แทน"""


@router.post("/report")
async def generate_report(payload: Dict[str, Any] = Body(...)):
    """
    Generate AI report and optionally send via email.
    Expects: { kpi, top_products, by_customer, monthly_ts, email?: str }
    """
    kpi = payload.get("kpi", {})
    top_products = payload.get("top_products", [])
    by_customer = payload.get("by_customer", [])
    monthly_ts = payload.get("monthly_ts", [])
    to_email = payload.get("email")

    data_summary = _build_data_summary(kpi, top_products, by_customer, monthly_ts)
    prompt = REPORT_PROMPT_TEMPLATE.format(data_summary=data_summary)

    try:
        report = await gemini_service.generate(prompt, max_tokens=1500)
    except QuotaExceededError as e:
        return APIResponse(
            success=False,
            error={"code": "QUOTA_EXCEEDED", "message": f"Gemini API โควต้าหมด กรุณารอ {e.retry_after:.0f} วินาทีแล้วลองใหม่", "retry_after": e.retry_after}
        )

    if report is None:
        return APIResponse(
            success=False,
            error={"code": "GEMINI_ERROR", "message": "ไม่สามารถสร้างรายงานได้ในขณะนี้"}
        )

    result = {"report": report, "email_sent": False, "email_to": None}

    # Send email if requested
    if to_email:
        from datetime import datetime
        today = datetime.now().strftime("%d/%m/%Y")
        subject = f"Sales Report - {today}"

        email_result = email_service.send_report(
            to_email=to_email,
            subject=subject,
            report_text=report,
        )
        result["email_sent"] = email_result["ok"]
        result["email_error"] = email_result.get("error")
        result["email_to"] = to_email

    return APIResponse(success=True, data=result)


# ──────────────────────────────────────────
# Phase 4: AI OCR — Purchase Order Reader
# ──────────────────────────────────────────

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "application/pdf"}


@router.post("/ocr")
async def ocr_purchase_order(
    file: UploadFile = File(...),
    custom_prompt: Optional[str] = Form(None),
    model: Optional[str] = Form(None),
):
    """
    Upload a PO image → Gemini Vision extracts structured data as JSON.
    Optionally specify a model (e.g. gemini-2.5-flash, gemini-3-flash-preview).
    """
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        return APIResponse(
            success=False,
            error={
                "code": "INVALID_FILE_TYPE",
                "message": f"ไม่รองรับไฟล์ประเภท {file.content_type} (รองรับ: PNG, JPEG, WebP, GIF, PDF)",
            },
        )

    # Validate model if provided
    selected_model = model or settings.GEMINI_MODEL
    if selected_model not in settings.GEMINI_AVAILABLE_MODELS:
        selected_model = settings.GEMINI_MODEL

    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10MB limit
        return APIResponse(
            success=False,
            error={"code": "FILE_TOO_LARGE", "message": "ไฟล์ใหญ่เกิน 10MB"},
        )

    result = await gemini_service.ocr_image(
        image_bytes=image_bytes,
        mime_type=file.content_type,
        custom_prompt=custom_prompt or "",
        model=selected_model,
    )

    if result is None:
        return APIResponse(
            success=False,
            error={"code": "GEMINI_ERROR", "message": "ไม่สามารถอ่านเอกสารได้ในขณะนี้"},
        )

    return APIResponse(
        success=True,
        data={
            "extracted": result,
            "filename": file.filename,
            "file_size": len(image_bytes),
            "mime_type": file.content_type,
            "model_used": selected_model,
        },
    )


# ──────────────────────────────────────────
# Phase 6: Simple RAG — Document Q&A
# ──────────────────────────────────────────

# In-memory document store (per session, demo only)
_rag_documents: Dict[str, str] = {}  # doc_id → extracted text


@router.post("/rag/upload")
async def rag_upload_document(
    file: UploadFile = File(...),
):
    """
    Upload a document → extract text → store in memory.
    Supports: PDF (via Gemini Vision), TXT, CSV.
    """
    file_bytes = await file.read()
    if len(file_bytes) > 20 * 1024 * 1024:
        return APIResponse(
            success=False,
            error={"code": "FILE_TOO_LARGE", "message": "ไฟล์ใหญ่เกิน 20MB"},
        )

    content_type = file.content_type or ""
    filename = file.filename or "unknown"
    extracted_text = ""

    try:
        # ── TXT / CSV → อ่านตรงๆ ──
        if content_type in ("text/plain", "text/csv") or filename.endswith((".txt", ".csv")):
            extracted_text = file_bytes.decode("utf-8", errors="replace")

        # ── PDF / Image → ใช้ Gemini Vision อ่าน ──
        elif content_type in ("application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"):
            client = gemini_service._get_client()
            file_part = types.Part.from_bytes(data=file_bytes, mime_type=content_type)
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=[
                    "อ่านเอกสารนี้แล้วแปลงเป็นข้อความ (plain text) ให้ครบทุกเนื้อหา ไม่ต้องสรุป ไม่ต้องย่อ คัดลอกเนื้อหาทั้งหมดออกมา",
                    file_part,
                ],
                config=types.GenerateContentConfig(
                    max_output_tokens=8000,
                    temperature=0.1,
                ),
            )
            extracted_text = (response.text or "").strip()
            if not extracted_text:
                return APIResponse(
                    success=False,
                    error={"code": "EXTRACT_FAILED", "message": "ไม่สามารถอ่านเนื้อหาจากเอกสารได้"},
                )
        else:
            return APIResponse(
                success=False,
                error={"code": "UNSUPPORTED_TYPE", "message": f"ไม่รองรับไฟล์ประเภท {content_type} (รองรับ: PDF, TXT, CSV, รูปภาพ)"},
            )

        # Store in memory
        import hashlib
        doc_id = hashlib.md5(file_bytes[:1024]).hexdigest()[:12]
        _rag_documents[doc_id] = extracted_text

        return APIResponse(success=True, data={
            "doc_id": doc_id,
            "filename": filename,
            "file_size": len(file_bytes),
            "text_length": len(extracted_text),
            "preview": extracted_text[:500] + ("..." if len(extracted_text) > 500 else ""),
        })

    except QuotaExceededError as e:
        return APIResponse(
            success=False,
            error={"code": "QUOTA_EXCEEDED", "message": f"Gemini API โควต้าหมด กรุณารอ {e.retry_after:.0f} วินาที"},
        )
    except Exception as e:
        logger.error(f"RAG upload error: {e}", exc_info=True)
        return APIResponse(
            success=False,
            error={"code": "UPLOAD_ERROR", "message": str(e)},
        )


@router.post("/rag/query")
async def rag_query(payload: Dict[str, Any] = Body(...)):
    """
    Ask a question about an uploaded document.
    Expects: { doc_id: str, question: str, history?: [{role, content}] }
    """
    doc_id = payload.get("doc_id", "")
    question = payload.get("question", "").strip()
    history = payload.get("history", [])

    if not doc_id or doc_id not in _rag_documents:
        return APIResponse(
            success=False,
            error={"code": "DOC_NOT_FOUND", "message": "ไม่พบเอกสาร กรุณาอัปโหลดใหม่"},
        )

    if not question:
        return APIResponse(
            success=False,
            error={"code": "NO_QUESTION", "message": "กรุณาส่งคำถาม"},
        )

    document_text = _rag_documents[doc_id]

    # Build conversation with document context
    system_prompt = f"""คุณเป็น AI ที่ช่วยตอบคำถามจากเอกสาร
คุณได้รับเอกสารดังนี้:

--- เริ่มเอกสาร ---
{document_text[:15000]}
--- จบเอกสาร ---

กฎสำคัญ:
- ตอบจากเนื้อหาในเอกสารเท่านั้น
- ถ้าเอกสารไม่มีข้อมูลที่ถาม ให้บอกตรงๆ ว่า "ไม่พบข้อมูลนี้ในเอกสาร"
- ตอบเป็นภาษาไทย ยกเว้นศัพท์เทคนิค
- ตอบกระชับ ตรงประเด็น ใช้ bullet points (•)
- อ้างอิงข้อมูลจากเอกสารโดยตรง"""

    try:
        # Build messages for multi-turn
        messages = []
        for msg in history:
            messages.append(msg)
        messages.append({"role": "user", "content": question})

        result = await gemini_service.chat(
            messages=messages,
            system_prompt=system_prompt,
            max_tokens=4096,
        )
    except QuotaExceededError as e:
        return APIResponse(
            success=False,
            error={"code": "QUOTA_EXCEEDED", "message": f"Gemini API โควต้าหมด กรุณารอ {e.retry_after:.0f} วินาที"},
        )

    if result is None:
        return APIResponse(
            success=False,
            error={"code": "GEMINI_ERROR", "message": "ไม่สามารถตอบได้ในขณะนี้"},
        )

    return APIResponse(success=True, data={"reply": result})


# ──────────────────────────────────────────
# Phase 5: AI Agent — Multi-step Autonomous
# ──────────────────────────────────────────

@router.post("/agent")
async def run_agent(payload: Dict[str, Any] = Body(...)):
    """
    AI Agent endpoint.
    User ส่งคำสั่ง → Agent วางแผน + เรียก tools + ทำงานจนเสร็จ
    Expects: { message: str }
    Returns: { answer: str, steps: [...], total_steps: int }
    """
    message = payload.get("message", "").strip()
    if not message:
        return APIResponse(
            success=False,
            error={"code": "NO_MESSAGE", "message": "กรุณาส่งข้อความ"}
        )

    try:
        result = await agent_service.run(message, max_steps=8)
        return APIResponse(success=True, data=result)
    except QuotaExceededError as e:
        return APIResponse(
            success=False,
            error={
                "code": "QUOTA_EXCEEDED",
                "message": f"Gemini API โควต้าหมด กรุณารอ {e.retry_after:.0f} วินาที",
                "retry_after": e.retry_after,
            }
        )
    except Exception as e:
        logger.error(f"Agent error: {e}", exc_info=True)
        return APIResponse(
            success=False,
            error={"code": "AGENT_ERROR", "message": str(e)}
        )


def _build_data_summary(
    kpi: Dict,
    top_products: List[Dict],
    by_customer: List[Dict],
    monthly_ts: List[Dict],
    analytics: Optional[Dict] = None,
    deep_dive: Optional[Dict] = None,
) -> str:
    lines = []

    # KPI
    if kpi:
        total_qty = kpi.get("total_qty", 0)
        mom = kpi.get("mom_growth", 0)
        wape = kpi.get("wape", 0)
        bias = kpi.get("bias", 0)
        promo_cov = kpi.get("promo_coverage", 0)
        avg_disc = kpi.get("avg_discount_pct", 0)
        total_actual = kpi.get("total_actual", 0)
        total_planned = kpi.get("total_planned", 0)

        lines.append("=== KPI Summary (Overview) ===")
        lines.append(f"Total Quantity: {total_qty:,.0f}")
        lines.append(f"MoM Growth: {mom:+.1f}%")
        if total_planned > 0:
            lines.append(f"Total Actual: {total_actual:,.0f} vs Planned: {total_planned:,.0f}")
            lines.append(f"WAPE (Forecast Error): {wape:.1f}%")
            lines.append(f"Bias: {bias:+.1f}%")
        lines.append(f"Promo Coverage: {promo_cov:.1f}%")
        lines.append(f"Avg Discount: {avg_disc:.1f}%")

    # Monthly trend (last 6 months)
    if monthly_ts:
        sorted_ts = sorted(monthly_ts, key=lambda x: x.get("year", 0) * 100 + x.get("month", 0))
        recent = sorted_ts[-6:]
        lines.append("\n=== Monthly Trend (Recent) ===")
        for pt in recent:
            lines.append(f"  {pt.get('year')}-{pt.get('month', 0):02d}: {pt.get('qty', 0):,.0f}")

    # Top products
    if top_products:
        lines.append("\n=== Top 5 Products ===")
        for p in top_products[:5]:
            lines.append(f"  {p.get('flavor', '')} {p.get('size', '')} ({p.get('product_group', '')}): {p.get('qty', 0):,.0f}")

    # Top customers
    if by_customer:
        lines.append("\n=== Top 5 Customers ===")
        for c in by_customer[:5]:
            lines.append(f"  {c.get('label', '')}: {c.get('qty', 0):,.0f}")

    # Analytics Dashboard
    if analytics:
        a_kpi = analytics.get("kpi") if isinstance(analytics, dict) else None
        if a_kpi:
            lines.append("\n=== Analytics Dashboard KPI ===")
            lines.append(f"Total Actual: {a_kpi.get('total_actual', 0):,.0f}")
            lines.append(f"Total Planned: {a_kpi.get('total_planned', 0):,.0f}")
            lines.append(f"WAPE: {a_kpi.get('wape', 0):.1f}%")
            lines.append(f"Bias: {a_kpi.get('bias', 0):+.1f}%")
            lines.append(f"Over-plan Rate: {a_kpi.get('over_plan_rate', 0):.1f}%")
            lines.append(f"Active Items: {a_kpi.get('total_active_items', 0)}")
            lines.append(f"Target Achievement: {a_kpi.get('target_achievement_rate', 0):.1f}%")

    # Deep Dive Dashboard
    if deep_dive and isinstance(deep_dive, dict):
        # Top under-plan items
        under = deep_dive.get("ranking_under_plan", [])
        if under:
            lines.append("\n=== Deep Dive: Top 5 Under-Plan Items ===")
            for item in under[:5]:
                lines.append(
                    f"  {item.get('flavor', '')} {item.get('size', '')} @ {item.get('customer', '')}: "
                    f"Actual {item.get('actual', 0):,.0f} vs Plan {item.get('planned', 0):,.0f} "
                    f"(Error {item.get('error', 0):+.1f}%)"
                )
        # Top over-plan items
        over = deep_dive.get("ranking_over_plan", [])
        if over:
            lines.append("\n=== Deep Dive: Top 5 Over-Plan Items ===")
            for item in over[:5]:
                lines.append(
                    f"  {item.get('flavor', '')} {item.get('size', '')} @ {item.get('customer', '')}: "
                    f"Actual {item.get('actual', 0):,.0f} vs Plan {item.get('planned', 0):,.0f} "
                    f"(Error {item.get('error', 0):+.1f}%)"
                )
        # Error distribution
        err_dist = deep_dive.get("error_dist", [])
        if err_dist:
            lines.append("\n=== Deep Dive: Error Distribution ===")
            for b in err_dist:
                lines.append(f"  {b.get('bin', '')}: {b.get('count', 0)} items")

    return "\n".join(lines)
