"""The one AI seam. AI_BACKEND selects gemini (default) or bedrock; routers and agent tools only see this.

Backends are synchronous objects; the facade exposes the async methods the routers await plus the
sync ones the agent tools call from inside the agent loop.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from functools import lru_cache
from typing import Optional, Protocol

from ..config import settings

logger = logging.getLogger(__name__)

TIER_LABELS = ["Fast", "Balanced", "Advanced"]


class QuotaExceededError(Exception):
    """Raised when the AI provider is out of quota (Gemini 429, Bedrock throttling)."""

    def __init__(self, retry_after: float = 60):
        self.retry_after = retry_after
        super().__init__(f"Quota exceeded. Retry after {retry_after:.0f}s")


@dataclass(frozen=True)
class ModelOption:
    id: str
    label: str
    description: str


EXTRACT_PROMPT = "อ่านเอกสารนี้แล้วแปลงเป็นข้อความ (plain text) ให้ครบทุกเนื้อหา ไม่ต้องสรุป ไม่ต้องย่อ คัดลอกเนื้อหาทั้งหมดออกมา"

OCR_PROMPT = """คุณเป็นระบบ OCR อัจฉริยะสำหรับอ่านเอกสารทางธุรกิจ เช่น Purchase Order (PO), ใบสั่งซื้อ, Invoice, Quotation, ใบเสนอราคา หรือเอกสารที่มีรายการสินค้า/บริการ

**สิ่งสำคัญที่สุด: พยายามอ่านข้อมูลจากภาพให้ได้มากที่สุด** แม้เอกสารจะไม่ได้เป็น PO มาตรฐาน ถ้ามีรายการสินค้า ราคา ผู้ซื้อ/ผู้ขาย ให้ดึงข้อมูลออกมา

อ่านภาพนี้แล้วดึงข้อมูลออกมาเป็น JSON โครงสร้างดังนี้:

{
  "po_number": "เลขที่เอกสาร (PO number, Invoice number, etc.)",
  "po_date": "วันที่เอกสาร (DD/MM/YYYY)",
  "customer_name": "ชื่อลูกค้า/ผู้สั่งซื้อ/ผู้ซื้อ",
  "customer_address": "ที่อยู่ลูกค้า (ถ้ามี)",
  "delivery_date": "วันที่ส่งสินค้า/กำหนดส่ง (ถ้ามี)",
  "items": [
    {
      "line_no": 1,
      "product_code": "รหัสสินค้า (ถ้ามี)",
      "product_name": "ชื่อสินค้า/รายการ",
      "quantity": 0,
      "unit": "หน่วย",
      "unit_price": 0,
      "total_price": 0
    }
  ],
  "subtotal": 0,
  "vat": 0,
  "grand_total": 0,
  "notes": "หมายเหตุเพิ่มเติม (ถ้ามี)"
}

กฎสำคัญ:
- ตอบเป็น JSON เท่านั้น ไม่ต้องมีข้อความอื่น
- ถ้าอ่านไม่ได้หรือไม่มีข้อมูลให้ใส่ null
- ตัวเลขให้เป็น number ไม่ใช่ string
- พยายามอ่านให้ได้ทุกกรณี ถ้าเอกสารมีรายการสินค้าหรือราคาให้ดึงข้อมูลออกมา
- ตอบ {"error": "..."} เฉพาะเมื่อภาพไม่ใช่เอกสารเลย (เช่น รูปคน รูปสัตว์ รูปวิว)"""

OCR_FIX_PROMPT = "JSON ด้านล่างมีปัญหา (อาจถูกตัด หรือ syntax ผิด) ช่วยแก้ให้ถูกต้องแล้วตอบเป็น JSON เท่านั้น:\n\n{text}"


def clean_and_parse_json(text: str) -> Optional[dict]:
    """Strip markdown fences and parse JSON. Returns None on failure."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
    if text.endswith("```"):
        text = text[:-3].strip()
    if text.startswith("json"):
        text = text[4:].strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


class AIBackend(Protocol):
    name: str

    def generate(self, prompt: str, max_tokens: int = 1024) -> Optional[str]: ...
    def chat(self, messages: list[dict], system_prompt: str = "", max_tokens: int = 1024) -> Optional[str]: ...
    def ocr_image(self, image_bytes: bytes, mime_type: str, custom_prompt: str = "", model: str = "") -> Optional[dict]: ...
    def extract_text(self, data: bytes, mime_type: str) -> Optional[str]: ...
    def current_model(self) -> str: ...
    def available_models(self) -> list[ModelOption]: ...
    def set_model(self, model_id: str) -> None: ...
    def describe(self) -> str: ...
    def agent_run(self, user_message: str, max_steps: int = 8) -> dict: ...


class AI:
    """Async facade over the selected backend (routers await these; agent tools use the *_sync ones)."""

    def __init__(self, backend: AIBackend):
        self.backend = backend

    @property
    def name(self) -> str:
        return self.backend.name

    # sync — used by agent tools inside the loop
    def generate_sync(self, prompt: str, max_tokens: int = 1024) -> Optional[str]:
        return self.backend.generate(prompt, max_tokens)

    async def generate(self, prompt: str, max_tokens: int = 1024) -> Optional[str]:
        return self.backend.generate(prompt, max_tokens)

    async def chat(self, messages: list[dict], system_prompt: str = "", max_tokens: int = 1024) -> Optional[str]:
        return self.backend.chat(messages, system_prompt, max_tokens)

    async def ocr_image(self, image_bytes: bytes, mime_type: str = "image/png", custom_prompt: str = "", model: str = "") -> Optional[dict]:
        return self.backend.ocr_image(image_bytes, mime_type, custom_prompt, model)

    async def extract_text(self, data: bytes, mime_type: str) -> Optional[str]:
        return self.backend.extract_text(data, mime_type)

    async def agent_run(self, user_message: str, max_steps: int = 8) -> dict:
        return self.backend.agent_run(user_message, max_steps)

    def current_model(self) -> str:
        return self.backend.current_model()

    def available_models(self) -> list[ModelOption]:
        return self.backend.available_models()

    def set_model(self, model_id: str) -> None:
        if model_id not in {m.id for m in self.available_models()}:
            raise ValueError(model_id)
        self.backend.set_model(model_id)

    def describe(self) -> str:
        return self.backend.describe()


@lru_cache(maxsize=1)
def get_ai() -> AI:
    if settings.AI_BACKEND == "gemini":
        from .gemini_backend import GeminiBackend
        return AI(GeminiBackend())
    if settings.AI_BACKEND == "bedrock":
        from .bedrock_backend import BedrockBackend
        return AI(BedrockBackend())
    raise ValueError(f"Unknown AI_BACKEND {settings.AI_BACKEND!r}")


def reset() -> None:
    get_ai.cache_clear()
