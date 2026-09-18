"""Claude on Amazon Bedrock through the Anthropic SDK.

BEDROCK_CLIENT=invoke uses the bedrock-runtime path (AnthropicBedrock) — the one that reaches this
account's inference profiles from ap-southeast-7. BEDROCK_CLIENT=mantle switches to the Messages-API
Bedrock endpoint where AWS offers it. Model IDs are configuration (BEDROCK_MODEL_*); newer Claude
models need an inference-profile ID (global./apac.) rather than a bare model ID.
"""
from __future__ import annotations

import base64
import json
import logging
from typing import Optional

import anthropic

from ..config import settings
from .ai_service import (EXTRACT_PROMPT, OCR_FIX_PROMPT, OCR_PROMPT, TIER_LABELS, ModelOption, QuotaExceededError,
                         clean_and_parse_json)

logger = logging.getLogger(__name__)


# ─── pure helpers (unit-tested) ─────────────────────────────────────────
def to_messages(messages: list[dict]) -> list[dict]:
    """Chat history -> Messages API roles (Gemini's 'model' role becomes 'assistant')."""
    return [{"role": "user" if m["role"] == "user" else "assistant", "content": m["content"]} for m in messages]


def media_block(data: bytes, mime_type: str) -> dict:
    kind = "document" if mime_type == "application/pdf" else "image"
    return {"type": kind, "source": {"type": "base64", "media_type": mime_type, "data": base64.b64encode(data).decode()}}


def pretty_model_name(model_id: str) -> str:
    """'global.anthropic.claude-sonnet-4-6' -> 'Claude Sonnet 4.6'."""
    core = model_id.split(".")[-1] if "anthropic." in model_id else model_id
    core = core.split(":")[0]
    parts = [p for p in core.replace("claude-", "").split("-") if not (p.isdigit() and len(p) == 8) and not p.startswith("v")]
    words, digits = [], []
    for p in parts:
        (digits if p.isdigit() else words).append(p)
    version = ".".join(digits)
    return f"Claude {' '.join(w.capitalize() for w in words)} {version}".strip()


def _schema(properties: dict, required: list[str]) -> dict:
    return {"type": "object", "properties": properties, "required": required, "additionalProperties": False}


AGENT_TOOLS = [
    {"name": "query_sales_data", "description": "ดึงข้อมูลยอดขายทั้งหมด: KPI summary, top products, top customers, monthly trend",
     "input_schema": _schema({}, []), "strict": True},
    {"name": "analyze_data", "description": "ให้ AI วิเคราะห์ข้อมูลเชิงลึก (ส่งข้อมูลเป็นข้อความหรือ JSON string)",
     "input_schema": _schema({"data": {"type": "string", "description": "ข้อมูลที่จะวิเคราะห์"},
                              "focus": {"type": "string", "description": "จุดที่ต้องการเน้น เช่น trend, product, customer"}}, ["data", "focus"]), "strict": True},
    {"name": "generate_report", "description": "สร้างรายงานสรุปจากข้อมูล",
     "input_schema": _schema({"data": {"type": "string", "description": "ข้อมูลที่จะสรุป"},
                              "format": {"type": "string", "enum": ["brief", "detailed"]}}, ["data", "format"]), "strict": True},
    {"name": "send_email", "description": "ส่งเมลไปยังผู้รับ (body ต้องใส่ตัวเลขจริง ห้ามใช้ placeholder)",
     "input_schema": _schema({"to": {"type": "string"}, "subject": {"type": "string"}, "body": {"type": "string"}}, ["to", "subject", "body"]), "strict": True},
    {"name": "get_product_list", "description": "ดูรายการสินค้าทั้งหมด", "input_schema": _schema({}, []), "strict": True},
    {"name": "get_customer_list", "description": "ดูรายการลูกค้าทั้งหมด", "input_schema": _schema({}, []), "strict": True},
]


def _agent_system_prompt() -> str:
    """The Gemini agent prompt minus its text protocol (Bedrock uses native tool use)."""
    from .agent_service import _agent_system_prompt as full
    head = full.split("## วิธีใช้ tool")[0]
    rules = full.split("## กฎสำคัญ", 1)
    tail = "## กฎสำคัญ" + rules[1] if len(rules) == 2 else ""
    return head + "\n" + tail


# ─── backend ────────────────────────────────────────────────────────────
class BedrockBackend:
    name = "bedrock"

    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None:
            kwargs = dict(aws_region=settings.BEDROCK_REGION, timeout=settings.AI_TIMEOUT_SEC, max_retries=1)
            if settings.BEDROCK_CLIENT == "mantle":
                self._client = anthropic.AnthropicBedrockMantle(**kwargs)
            else:
                self._client = anthropic.AnthropicBedrock(**kwargs)
        return self._client

    # ── model tiers ──
    def current_model(self) -> str:
        return settings.BEDROCK_MODEL

    def available_models(self) -> list[ModelOption]:
        ids = [settings.BEDROCK_MODEL_FAST, settings.BEDROCK_MODEL_BALANCED, settings.BEDROCK_MODEL_ADVANCED]
        blurbs = ["fast, lowest cost", "default", "highest quality"]
        return [ModelOption(i, label, f"{pretty_model_name(i)} — {b}") for i, label, b in zip(ids, TIER_LABELS, blurbs)]

    def set_model(self, model_id: str) -> None:
        settings.BEDROCK_MODEL = model_id

    def describe(self) -> str:
        return f"bedrock {settings.BEDROCK_MODEL} in {settings.BEDROCK_REGION} ({settings.BEDROCK_CLIENT}, timeout {settings.AI_TIMEOUT_SEC}s)"

    # ── calls ──
    def _create(self, *, messages: list[dict], max_tokens: int, system: str = "", temperature: float = 0.7, model: str = "", tools: list | None = None):
        kwargs = dict(model=model or settings.BEDROCK_MODEL, max_tokens=max_tokens, messages=messages)  # sampling params are not accepted by the 1.x SDK; temperature is ignored
        if system:
            kwargs["system"] = system
        if tools:
            kwargs["tools"] = tools
        try:
            return self._get_client().messages.create(**kwargs)
        except anthropic.RateLimitError as e:
            retry = float(e.response.headers.get("retry-after", "60")) if getattr(e, "response", None) else 60.0
            logger.warning("Bedrock throttled: %s", str(e)[:200])
            raise QuotaExceededError(retry)
        except anthropic.APIStatusError as e:
            if e.status_code == 429 or "ThrottlingException" in str(e):
                raise QuotaExceededError(60)
            raise

    @staticmethod
    def _text(response) -> str:
        return "".join(b.text for b in response.content if getattr(b, "type", "") == "text").strip()

    def generate(self, prompt: str, max_tokens: int = 1024) -> Optional[str]:
        try:
            return self._text(self._create(messages=[{"role": "user", "content": prompt}], max_tokens=max_tokens))
        except QuotaExceededError:
            raise
        except Exception as e:
            logger.error("Bedrock generate error: %s", e, exc_info=True)
            return None

    def chat(self, messages: list[dict], system_prompt: str = "", max_tokens: int = 1024) -> Optional[str]:
        try:
            return self._text(self._create(messages=to_messages(messages), system=system_prompt, max_tokens=max_tokens))
        except QuotaExceededError:
            raise
        except Exception as e:
            logger.error("Bedrock chat error: %s", e, exc_info=True)
            return None

    def ocr_image(self, image_bytes: bytes, mime_type: str = "image/png", custom_prompt: str = "", model: str = "") -> Optional[dict]:
        try:
            content = [media_block(image_bytes, mime_type), {"type": "text", "text": custom_prompt or OCR_PROMPT}]
            text = self._text(self._create(messages=[{"role": "user", "content": content}], max_tokens=8192, temperature=0.1, model=model))
            parsed = clean_and_parse_json(text)
            if parsed is not None:
                return parsed
            logger.warning("OCR JSON parse failed, retrying with fix prompt. Raw: %s", text[:300])
            fixed = self._text(self._create(messages=[{"role": "user", "content": OCR_FIX_PROMPT.format(text=text)}], max_tokens=8192, temperature=0.0, model=model))
            parsed = clean_and_parse_json(fixed)
            if parsed is not None:
                return parsed
            return {"error": "AI ตอบ JSON ไม่สมบูรณ์ ลองเปลี่ยน model หรืออัปโหลดรูปที่ชัดขึ้น", "raw_text": text}
        except QuotaExceededError:
            raise
        except Exception as e:
            logger.error("Bedrock OCR error: %s", e, exc_info=True)
            return None

    def extract_text(self, data: bytes, mime_type: str) -> Optional[str]:
        try:
            content = [media_block(data, mime_type), {"type": "text", "text": EXTRACT_PROMPT}]
            return self._text(self._create(messages=[{"role": "user", "content": content}], max_tokens=8000, temperature=0.1))
        except QuotaExceededError:
            raise
        except Exception as e:
            logger.error("Bedrock extract error: %s", e, exc_info=True)
            return None

    # ── agent: native tool use, same step shape as the Gemini loop ──
    def agent_run(self, user_message: str, max_steps: int = 8) -> dict:
        from .agent_service import AgentTools, _summarize_steps_static

        tools = AgentTools()
        registry = {t["name"]: getattr(tools, t["name"]) for t in AGENT_TOOLS}
        messages: list[dict] = [{"role": "user", "content": user_message}]
        steps: list[dict] = []
        system = _agent_system_prompt()
        for step_num in range(1, max_steps + 1):
            try:
                response = self._create(messages=messages, system=system, max_tokens=1024, temperature=0.3, tools=AGENT_TOOLS)
            except QuotaExceededError:
                if steps:
                    return {"answer": _summarize_steps_static(steps) + "\n\n(Agent ทำงานครบแล้ว แต่โควต้า AI หมดก่อนสรุปผล)", "steps": steps, "total_steps": step_num}
                return {"answer": "AI โควต้าหมด กรุณาลองเปลี่ยน model หรือรอสักครู่", "steps": steps, "total_steps": step_num}
            except Exception as e:
                steps.append({"step": step_num, "type": "error", "error": str(e)})
                return {"answer": f"เกิดข้อผิดพลาด: {e}", "steps": steps, "total_steps": step_num}

            thought = self._text(response)
            tool_uses = [b for b in response.content if getattr(b, "type", "") == "tool_use"]
            if response.stop_reason != "tool_use" or not tool_uses:
                steps.append({"step": step_num, "type": "done", "answer": thought})
                return {"answer": thought, "steps": steps, "total_steps": step_num}

            messages.append({"role": "assistant", "content": [b.model_dump() for b in response.content]})
            results = []
            for tu in tool_uses:
                params = dict(tu.input or {})
                info = {"step": step_num, "type": "tool_call", "thought": thought, "tool": tu.name, "params": params}
                fn = registry.get(tu.name)
                result = fn(params) if fn else {"status": "error", "message": f"ไม่พบ tool: {tu.name}"}
                info["result"], info["status"] = result, "success" if fn else "error"
                steps.append(info)
                results.append({"type": "tool_result", "tool_use_id": tu.id, "content": json.dumps(result, ensure_ascii=False, default=str)})
            messages.append({"role": "user", "content": results})

        return {"answer": f"Agent ทำงานครบ {max_steps} ขั้นตอนแล้ว อาจต้องลองใหม่ด้วยคำสั่งที่เฉพาะเจาะจงขึ้น", "steps": steps, "total_steps": max_steps}
