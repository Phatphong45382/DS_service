"""
AI Agent Service — Sales Analysis Agent
========================================
Agent = while loop + LLM ตัดสินใจ + เรียก function

หลักการ:
1. รับคำสั่งจาก user (เช่น "วิเคราะห์ยอดขายแล้วส่งเมลให้หัวหน้า")
2. ส่งให้ LLM พร้อมรายการ tools ที่ใช้ได้
3. LLM ตัดสินใจว่าจะใช้ tool ไหน หรือจะตอบ user เลย
4. ถ้าใช้ tool → เรียก function จริง → ส่งผลกลับให้ LLM คิดต่อ
5. วนซ้ำจนกว่า LLM จะบอกว่า "เสร็จแล้ว" (DONE)
"""

import json
import logging
import re
from typing import Optional
from datetime import datetime

from google import genai
from google.genai import types
from google.genai.errors import ClientError

from ..config import settings

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════
# ส่วนที่ 1: TOOL DEFINITIONS
# อธิบายให้ LLM รู้ว่ามี tools อะไรให้ใช้
# ═══════════════════════════════════════════

TOOL_DEFINITIONS = """
คุณมีเครื่องมือ (tools) เหล่านี้ให้ใช้:

1. query_sales_data
   - ดึงข้อมูลยอดขายจาก database
   - parameters: (ไม่มี — ดึงข้อมูลทั้งหมด)
   - return: KPI summary, top products, top customers, monthly trend

2. analyze_data
   - ให้ AI วิเคราะห์ข้อมูลเชิงลึก
   - parameters: {"data": "ข้อมูลที่จะวิเคราะห์", "focus": "จุดที่ต้องการเน้น เช่น trend, product, customer"}
   - return: ผลวิเคราะห์เป็นข้อความ

3. generate_report
   - สร้างรายงานสรุปจากข้อมูล
   - parameters: {"data": "ข้อมูลที่จะสรุป", "format": "brief หรือ detailed"}
   - return: รายงานเป็นข้อความ

4. send_email
   - ส่งเมลไปยังผู้รับ
   - parameters: {"to": "อีเมลผู้รับ", "subject": "หัวข้อ", "body": "เนื้อหา"}
   - return: ผลการส่ง (sent/failed)

5. get_product_list
   - ดูรายการสินค้าทั้งหมด
   - parameters: (ไม่มี)
   - return: รายการสินค้า

6. get_customer_list
   - ดูรายการลูกค้าทั้งหมด
   - parameters: (ไม่มี)
   - return: รายการลูกค้า
"""


# ═══════════════════════════════════════════
# ส่วนที่ 2: SYSTEM PROMPT
# บอก LLM ว่าเป็น Agent ต้องทำตัวยังไง
# ═══════════════════════════════════════════

_agent_system_prompt = f"""คุณเป็น Sales AI Agent ของบริษัทเครื่องดื่ม
คุณสามารถวางแผนและดำเนินการหลายขั้นตอนเพื่อตอบคำถามหรือทำงานตามที่ user สั่ง

{TOOL_DEFINITIONS}

## วิธีใช้ tool
เมื่อต้องการใช้เครื่องมือ ให้ตอบในรูปแบบนี้เท่านั้น:
THOUGHT: [คิดว่าต้องทำอะไร ทำไม]
ACTION: [ชื่อ tool]
PARAMS: [JSON parameters]

## เมื่อทำเสร็จ
เมื่อทำทุกอย่างเสร็จแล้ว ให้ตอบ:
DONE: [สรุปสิ่งที่ทำทั้งหมดให้ user เป็นภาษาไทย]

## กฎสำคัญ
- ตอบเป็นภาษาไทย ยกเว้นศัพท์เทคนิค
- ใช้ tool ทีละตัว รอผลก่อนค่อยใช้ตัวถัดไป
- ถ้า user ถามคำถามง่ายๆ ที่ไม่ต้องใช้ tool ให้ตอบเลย (ใช้ DONE:)
- ถ้าต้องส่งเมล ต้องถาม user ก่อนว่าส่งไปที่ไหน (ถ้ายังไม่ได้ระบุ)
- THOUGHT ต้องแสดงเหตุผลว่าทำไมถึงเลือก tool นั้น
- ห้ามเรียก tool ซ้ำด้วย parameter เดิม
- ตอบ DONE ให้กระชับ ใช้ bullet points (•)
"""


# ═══════════════════════════════════════════
# ส่วนที่ 3: TOOL IMPLEMENTATIONS
# Function จริงที่ Agent เรียกใช้
# ═══════════════════════════════════════════

class AgentTools:
    """รวม function ทั้งหมดที่ Agent เรียกใช้ได้"""

    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None:
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    def reset_client(self):
        self._client = None

    # ─── Tool 1: ดึงข้อมูลยอดขาย ───
    def query_sales_data(self, params: dict) -> dict:
        """
        ดึงข้อมูลยอดขายจาก Dataiku แล้วสรุปเป็น KPI
        ── นี่คือ tool ที่ Agent เรียกเมื่อต้องการ "ดูข้อมูล" ──
        """
        try:
            from ..services.dataiku_service import dataiku_service

            rows = dataiku_service.get_dataset_rows(settings.DATASET_DASHBOARD_SUMMARY)

            # Aggregate
            total_qty = 0.0
            monthly_agg = {}
            cust_agg = {}
            product_agg = {}

            for row in rows:
                if row.get("Product_Group") == "Canned Fruit":
                    continue

                qty = float(row.get("Quantity_sum", 0))
                total_qty += qty

                # Monthly
                y = int(row.get("Billing_Date_year", 0))
                m = int(row.get("Billing_Date_month", 0))
                if y and m:
                    key = f"{y}-{m:02d}"
                    monthly_agg[key] = monthly_agg.get(key, 0) + qty

                # Customer (masked)
                from ..services.data_masking import masker
                c = masker.mask("customer", row.get("Customer", "Unknown"))
                cust_agg[c] = cust_agg.get(c, 0) + qty

                # Product (masked)
                pg = masker.mask("product_group", row.get("Product_Group", ""))
                fl = masker.mask("flavor", row.get("Flavor", ""))
                sz = masker.mask("size", str(row.get("Size", "")))
                p_key = f"{fl} {sz} ({pg})"
                product_agg[p_key] = product_agg.get(p_key, 0) + qty

            # Sort and top N
            top_products = sorted(product_agg.items(), key=lambda x: x[1], reverse=True)[:10]
            top_customers = sorted(cust_agg.items(), key=lambda x: x[1], reverse=True)[:10]
            monthly_sorted = sorted(monthly_agg.items())
            recent_months = monthly_sorted[-6:]  # last 6 months

            # Calculate MoM growth
            mom_growth = 0.0
            if len(monthly_sorted) >= 2:
                latest = monthly_sorted[-1][1]
                previous = monthly_sorted[-2][1]
                if previous > 0:
                    mom_growth = ((latest - previous) / previous) * 100

            return {
                "status": "success",
                "kpi": {
                    "total_qty": f"{total_qty:,.0f}",
                    "mom_growth": f"{mom_growth:+.1f}%",
                    "total_products": len(product_agg),
                    "total_customers": len(cust_agg),
                },
                "top_products": [{"name": k, "qty": f"{v:,.0f}"} for k, v in top_products],
                "top_customers": [{"name": k, "qty": f"{v:,.0f}"} for k, v in top_customers],
                "monthly_trend": [{"month": k, "qty": f"{v:,.0f}"} for k, v in recent_months],
            }
        except Exception as e:
            logger.error(f"query_sales_data error: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}

    # ─── Tool 2: วิเคราะห์ข้อมูลด้วย LLM ───
    def analyze_data(self, params: dict) -> dict:
        """
        ส่งข้อมูลให้ LLM วิเคราะห์เชิงลึก
        ── Agent ใช้ tool นี้เมื่อมีข้อมูลแล้ว แต่ต้องการ "วิเคราะห์" ──
        """
        data = params.get("data", "")
        focus = params.get("focus", "general")

        prompt = f"""วิเคราะห์ข้อมูลยอดขายนี้โดยเน้น {focus}:

{json.dumps(data, ensure_ascii=False, indent=2) if isinstance(data, dict) else str(data)}

ให้ผลวิเคราะห์:
• จุดเด่น/จุดสังเกต 3-4 ข้อ
• แนวโน้ม
• คำแนะนำ 1-2 ข้อ
ตอบเป็นภาษาไทย กระชับ"""

        try:
            client = self._get_client()
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(max_output_tokens=800, temperature=0.7),
            )
            return {"status": "success", "analysis": response.text or "ไม่สามารถวิเคราะห์ได้"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # ─── Tool 3: สร้างรายงาน ───
    def generate_report(self, params: dict) -> dict:
        """
        สร้างรายงานจากข้อมูลที่มี
        ── Agent ใช้ tool นี้เมื่อต้องการ "เขียนรายงาน" ──
        """
        data = params.get("data", "")
        fmt = params.get("format", "brief")

        length_guide = "สรุปสั้นๆ 5-6 ข้อ" if fmt == "brief" else "รายงานละเอียด 10-15 ข้อ พร้อมหัวข้อย่อย"

        prompt = f"""สร้างรายงานสรุปยอดขายจากข้อมูลนี้:

{json.dumps(data, ensure_ascii=False, indent=2) if isinstance(data, dict) else str(data)}

รูปแบบ: {length_guide}
ตอบเป็นภาษาไทย เหมาะสำหรับส่งให้ผู้บริหาร"""

        try:
            client = self._get_client()
            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(max_output_tokens=1200, temperature=0.7),
            )
            return {"status": "success", "report": response.text or "ไม่สามารถสร้างรายงานได้"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # ─── Tool 4: ส่งเมล ───
    def send_email(self, params: dict) -> dict:
        """
        ส่งเมลจริงผ่าน Gmail SMTP
        ── Agent ใช้ tool นี้เมื่อ user สั่งให้ "ส่งเมล" ──
        """
        to = params.get("to", "")
        subject = params.get("subject", "Sales Report")
        body = params.get("body", "")

        if not to:
            return {"status": "error", "message": "ไม่ได้ระบุอีเมลผู้รับ"}

        try:
            from ..services.email_service import email_service
            result = email_service.send_report(
                to_email=to,
                subject=subject,
                report_text=body,
            )
            if result["ok"]:
                return {"status": "sent", "to": to, "subject": subject}
            else:
                return {"status": "failed", "message": f"ส่งเมลไม่สำเร็จ: {result['error']}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # ─── Tool 5: ดูรายการสินค้า ───
    def get_product_list(self, params: dict) -> dict:
        """ดึงรายการสินค้าทั้งหมด"""
        try:
            from ..services.dataiku_service import dataiku_service
            rows = dataiku_service.get_dataset_rows(settings.DATASET_DASHBOARD_SUMMARY)

            from ..services.data_masking import masker
            products = set()
            for row in rows:
                if row.get("Product_Group") == "Canned Fruit":
                    continue
                pg = masker.mask("product_group", row.get("Product_Group", ""))
                fl = masker.mask("flavor", row.get("Flavor", ""))
                sz = str(row.get("Size", ""))
                if fl:
                    products.add(f"{fl} {sz} ({pg})")

            return {"status": "success", "products": sorted(list(products)), "count": len(products)}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # ─── Tool 6: ดูรายการลูกค้า ───
    def get_customer_list(self, params: dict) -> dict:
        """ดึงรายการลูกค้าทั้งหมด"""
        try:
            from ..services.dataiku_service import dataiku_service
            rows = dataiku_service.get_dataset_rows(settings.DATASET_DASHBOARD_SUMMARY)

            from ..services.data_masking import masker
            customers = set()
            for row in rows:
                c = row.get("Customer", "")
                if c:
                    customers.add(masker.mask("customer", c))

            return {"status": "success", "customers": sorted(list(customers)), "count": len(customers)}
        except Exception as e:
            return {"status": "error", "message": str(e)}


# ═══════════════════════════════════════════
# ส่วนที่ 4: AGENT LOOP (หัวใจสำคัญ!)
# วน: LLM คิด → เรียก Tool → ส่งผลกลับ → LLM คิดต่อ
# ═══════════════════════════════════════════

class AgentService:
    """
    Agent Loop — ส่วนที่ทำให้เป็น "Agent" ไม่ใช่แค่ LLM

    Flow:
    1. รับ user message
    2. ส่งให้ LLM พร้อม system prompt (ที่มีรายการ tools)
    3. Parse response → ถ้า ACTION: → เรียก tool → ส่งผลกลับ LLM
    4. วนซ้ำจนกว่า LLM จะตอบ DONE:
    """

    def __init__(self):
        self.tools = AgentTools()
        self._client = None
        # Mapping ชื่อ tool → function จริง
        self.tool_registry = {
            "query_sales_data": self.tools.query_sales_data,
            "analyze_data": self.tools.analyze_data,
            "generate_report": self.tools.generate_report,
            "send_email": self.tools.send_email,
            "get_product_list": self.tools.get_product_list,
            "get_customer_list": self.tools.get_customer_list,
        }

    def _get_client(self):
        if self._client is None:
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    def reset_client(self):
        self._client = None
        self.tools.reset_client()

    async def run(self, user_message: str, max_steps: int = 8) -> dict:
        """
        Agent Loop หลัก

        Parameters:
            user_message: คำสั่งจาก user
            max_steps: จำนวน step สูงสุด (กัน infinite loop)

        Returns:
            {
                "answer": "คำตอบสุดท้าย",
                "steps": [...],  // log ทุก step ที่ Agent ทำ
                "total_steps": int
            }
        """

        # ──── เตรียม conversation history ────
        # ใช้ list เก็บ messages ทั้งหมดที่ LLM เห็น
        conversation = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=user_message)],
            )
        ]

        steps = []  # เก็บ log ว่า Agent ทำอะไรบ้าง แต่ละ step

        # ──── Agent Loop: วนคิด→ทำ→คิด→ทำ ────
        for step_num in range(1, max_steps + 1):
            logger.info(f"Agent step {step_num}/{max_steps}")

            try:
                # ── ขั้น "คิด": ส่งทั้ง conversation ให้ LLM ──
                client = self._get_client()
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=conversation,
                    config=types.GenerateContentConfig(
                        max_output_tokens=1024,
                        temperature=0.3,  # ต่ำหน่อย ให้ตัดสินใจแม่นยำ
                        system_instruction=_agent_system_prompt,
                    ),
                )

                llm_text = (response.text or "").strip()
                if not llm_text:
                    # LLM returned empty — treat as done
                    steps.append({"step": step_num, "type": "error", "error": "LLM returned empty response"})
                    return {
                        "answer": "Agent ไม่สามารถประมวลผลได้ กรุณาลองใหม่",
                        "steps": steps,
                        "total_steps": step_num,
                    }
                logger.info(f"Agent LLM response:\n{llm_text[:300]}")

                # ── Parse: ดูว่า LLM ตัดสินใจทำอะไร ──
                parsed = self._parse_response(llm_text)

                if parsed["type"] == "done":
                    # ═══ LLM บอกว่า "เสร็จแล้ว" → จบ loop ═══
                    steps.append({
                        "step": step_num,
                        "type": "done",
                        "answer": parsed["content"],
                    })
                    return {
                        "answer": parsed["content"],
                        "steps": steps,
                        "total_steps": step_num,
                    }

                elif parsed["type"] == "action":
                    # ═══ LLM ต้องการใช้ tool → เรียก function จริง ═══
                    tool_name = parsed["tool"]
                    tool_params = parsed["params"]
                    thought = parsed.get("thought", "")

                    # Log step
                    step_info = {
                        "step": step_num,
                        "type": "tool_call",
                        "thought": thought,
                        "tool": tool_name,
                        "params": tool_params,
                    }

                    # ── ขั้น "ทำ": เรียก tool จริง ──
                    if tool_name in self.tool_registry:
                        tool_fn = self.tool_registry[tool_name]
                        tool_result = tool_fn(tool_params)
                        step_info["result"] = tool_result
                        step_info["status"] = "success"
                    else:
                        tool_result = {"status": "error", "message": f"ไม่พบ tool: {tool_name}"}
                        step_info["result"] = tool_result
                        step_info["status"] = "error"

                    steps.append(step_info)

                    # ── ใส่ผลลัพธ์กลับเข้า conversation ──
                    # ตัดให้สั้น เพื่อไม่ให้ context ใหญ่เกินไปจน Gemini 500
                    result_text = json.dumps(tool_result, ensure_ascii=False, indent=2)
                    if len(result_text) > 2000:
                        result_text = result_text[:2000] + "\n... (truncated)"

                    conversation.append(
                        types.Content(
                            role="model",
                            parts=[types.Part.from_text(text=llm_text)],
                        )
                    )
                    conversation.append(
                        types.Content(
                            role="user",
                            parts=[types.Part.from_text(
                                text=f"Tool '{tool_name}' result:\n{result_text}"
                            )],
                        )
                    )
                    # → กลับไปต้น loop → LLM จะเห็นผล tool แล้วตัดสินใจต่อ

                else:
                    # ═══ LLM ตอบแบบธรรมดา (ไม่มี ACTION/DONE) → ถือว่าจบ ═══
                    steps.append({
                        "step": step_num,
                        "type": "direct_answer",
                        "answer": llm_text,
                    })
                    return {
                        "answer": llm_text,
                        "steps": steps,
                        "total_steps": step_num,
                    }

            except ClientError as e:
                steps.append({
                    "step": step_num,
                    "type": "error",
                    "error": str(e),
                })
                if e.code == 429:
                    # ถ้าทำ tool ไปแล้วหลาย step → สรุปจากผลที่มี
                    if len(steps) > 1:
                        summary = self._summarize_steps(steps)
                        return {
                            "answer": summary + "\n\n(Agent ทำงานครบแล้ว แต่โควต้า Gemini หมดก่อนสรุปผล)",
                            "steps": steps,
                            "total_steps": step_num,
                        }
                    return {
                        "answer": "Gemini API โควต้าหมด กรุณาลองเปลี่ยน model หรือรอสักครู่",
                        "steps": steps,
                        "total_steps": step_num,
                    }
                return {
                    "answer": f"เกิดข้อผิดพลาด: {str(e)}",
                    "steps": steps,
                    "total_steps": step_num,
                }
            except Exception as e:
                logger.error(f"Agent step {step_num} error: {e}", exc_info=True)
                steps.append({
                    "step": step_num,
                    "type": "error",
                    "error": str(e),
                })
                return {
                    "answer": f"เกิดข้อผิดพลาด: {str(e)}",
                    "steps": steps,
                    "total_steps": step_num,
                }

        # ═══ ถ้าวนครบ max_steps แล้วยังไม่จบ ═══
        return {
            "answer": "Agent ทำงานครบ {max_steps} ขั้นตอนแล้ว อาจต้องลองใหม่ด้วยคำสั่งที่เฉพาะเจาะจงขึ้น",
            "steps": steps,
            "total_steps": max_steps,
        }

    def _parse_response(self, text: str) -> dict:
        """
        Parse LLM response เพื่อดูว่า Agent ต้องการทำอะไร

        Patterns ที่รองรับ:
        1. DONE: ...        → จบ ส่งคำตอบ
        2. ACTION: ...      → เรียก tool
           PARAMS: {...}
        3. อื่นๆ            → ตอบตรงๆ (ไม่ใช้ tool)
        """

        # Check for DONE
        done_match = re.search(r'DONE:\s*(.*)', text, re.DOTALL)
        if done_match:
            return {"type": "done", "content": done_match.group(1).strip()}

        # Check for ACTION
        action_match = re.search(r'ACTION:\s*(\w+)', text)
        if action_match:
            tool_name = action_match.group(1).strip()

            # Extract THOUGHT
            thought = ""
            thought_match = re.search(r'THOUGHT:\s*(.*?)(?=ACTION:|$)', text, re.DOTALL)
            if thought_match:
                thought = thought_match.group(1).strip()

            # Extract PARAMS
            params = {}
            params_match = re.search(r'PARAMS:\s*(\{.*?\})', text, re.DOTALL)
            if params_match:
                try:
                    params = json.loads(params_match.group(1))
                except json.JSONDecodeError:
                    params = {}

            return {
                "type": "action",
                "tool": tool_name,
                "params": params,
                "thought": thought,
            }

        # Default: direct answer
        return {"type": "direct", "content": text}

    def _summarize_steps(self, steps: list) -> str:
        """
        สรุปผลจาก steps ที่ทำไปแล้ว (ใช้เมื่อ LLM โควต้าหมดก่อนสรุป)
        ไม่เรียก LLM — สรุปจาก data ที่มีอยู่
        """
        lines = ["สรุปสิ่งที่ Agent ทำ:"]
        for s in steps:
            if s.get("type") == "tool_call" and s.get("status") == "success":
                tool = s.get("tool", "")
                label = {
                    "query_sales_data": "ดึงข้อมูลยอดขาย",
                    "analyze_data": "วิเคราะห์ข้อมูล",
                    "generate_report": "สร้างรายงาน",
                    "send_email": "ส่งอีเมล",
                    "get_product_list": "ดูรายการสินค้า",
                    "get_customer_list": "ดูรายการลูกค้า",
                }.get(tool, tool)

                result = s.get("result", {})
                detail = ""
                if tool == "send_email" and result.get("status") == "sent":
                    detail = f" → ส่งให้ {result.get('to', '')} แล้ว"
                elif tool == "query_sales_data" and result.get("kpi"):
                    kpi = result["kpi"]
                    detail = f" → ยอดรวม {kpi.get('total_qty', '?')}"
                elif tool == "generate_report" and result.get("report"):
                    detail = f" → สร้างเรียบร้อย"
                elif tool == "analyze_data" and result.get("analysis"):
                    detail = f" → วิเคราะห์เรียบร้อย"

                lines.append(f"• {label}{detail}")

        return "\n".join(lines)


# Singleton instance
agent_service = AgentService()
