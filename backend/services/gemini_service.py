from google import genai
from google.genai import types
from google.genai.errors import ClientError
import asyncio
import logging
import json
import re
from typing import Optional

from ..config import settings
from .ai_service import OCR_FIX_PROMPT, OCR_PROMPT, QuotaExceededError, clean_and_parse_json

logger = logging.getLogger(__name__)


def _parse_retry_delay(error: ClientError) -> Optional[float]:
    """Extract retry delay seconds from a 429 error."""
    try:
        err_str = str(error)
        match = re.search(r'retryDelay.*?(\d+(?:\.\d+)?)', err_str)
        if match:
            return float(match.group(1))
    except Exception:
        pass
    return None


class GeminiService:
    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None:
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY, http_options={"timeout": settings.AI_TIMEOUT_SEC * 1000})
        return self._client

    def _call_generate(self, client, model, contents, config):
        """Synchronous call with 1 auto-retry on 429."""
        try:
            return client.models.generate_content(
                model=model, contents=contents, config=config,
            )
        except ClientError as e:
            if e.code == 429:
                delay = _parse_retry_delay(e) or 5
                wait = min(delay + 1, 60)
                logger.warning(f"Rate limited. Waiting {wait:.0f}s before retry...")
                import time
                time.sleep(wait)
                return client.models.generate_content(
                    model=model, contents=contents, config=config,
                )
            raise

    async def generate(self, prompt: str, max_tokens: int = 1024) -> Optional[str]:
        try:
            client = self._get_client()
            response = self._call_generate(
                client,
                settings.GEMINI_MODEL,
                prompt,
                types.GenerateContentConfig(
                    max_output_tokens=max_tokens,
                    temperature=0.7,
                ),
            )
            return response.text
        except ClientError as e:
            if e.code == 429:
                delay = _parse_retry_delay(e) or 60
                logger.warning(f"Gemini quota exceeded after retry. Wait {delay:.0f}s.")
                raise QuotaExceededError(delay)
            logger.error(f"Gemini API error: {e}")
            return None
        except Exception as e:
            logger.error(f"Gemini API error: {e}", exc_info=True)
            return None

    async def chat(
        self,
        messages: list[dict],
        system_prompt: str = "",
        max_tokens: int = 1024,
    ) -> Optional[str]:
        """Multi-turn chat using Gemini."""
        try:
            client = self._get_client()

            contents = []
            for msg in messages:
                role = "user" if msg["role"] == "user" else "model"
                contents.append(types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=msg["content"])],
                ))

            response = self._call_generate(
                client,
                settings.GEMINI_MODEL,
                contents,
                types.GenerateContentConfig(
                    max_output_tokens=max_tokens,
                    temperature=0.7,
                    system_instruction=system_prompt if system_prompt else None,
                ),
            )
            return response.text
        except ClientError as e:
            if e.code == 429:
                delay = _parse_retry_delay(e) or 60
                logger.warning(f"Gemini quota exceeded after retry. Wait {delay:.0f}s.")
                raise QuotaExceededError(delay)
            logger.error(f"Gemini Chat error: {e}")
            return None
        except Exception as e:
            logger.error(f"Gemini Chat error: {e}", exc_info=True)
            return None

    @staticmethod
    def _clean_and_parse_json(text: str) -> Optional[dict]:
        return clean_and_parse_json(text)

    async def ocr_image(
        self,
        image_bytes: bytes,
        mime_type: str = "image/png",
        custom_prompt: str = "",
        model: str = "",
    ) -> Optional[dict]:
        """Extract structured data from a Purchase Order image using Gemini Vision."""
        try:
            client = self._get_client()

            image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

            prompt = custom_prompt or OCR_PROMPT

            use_model = model or settings.GEMINI_MODEL
            response = self._call_generate(
                client,
                use_model,
                [prompt, image_part],
                types.GenerateContentConfig(
                    max_output_tokens=8192,
                    temperature=0.1,
                ),
            )

            text = response.text.strip()
            parsed = self._clean_and_parse_json(text)
            if parsed is not None:
                return parsed

            # JSON parse failed — retry once asking Gemini to fix it
            logger.warning(f"OCR JSON parse failed, retrying with fix prompt. Raw: {text[:300]}")
            fix_prompt = OCR_FIX_PROMPT.format(text=text)
            fix_response = self._call_generate(
                client,
                use_model,
                fix_prompt,
                types.GenerateContentConfig(
                    max_output_tokens=8192,
                    temperature=0.0,
                ),
            )
            fix_text = fix_response.text.strip()
            parsed = self._clean_and_parse_json(fix_text)
            if parsed is not None:
                return parsed

            return {"error": f"AI ตอบ JSON ไม่สมบูรณ์ ลองเปลี่ยน model หรืออัปโหลดรูปที่ชัดขึ้น", "raw_text": text}
        except ClientError as e:
            if e.code == 429:
                delay = _parse_retry_delay(e) or 60
                raise QuotaExceededError(delay)
            logger.error(f"Gemini OCR error: {e}")
            return None
        except Exception as e:
            logger.error(f"Gemini OCR error: {e}", exc_info=True)
            return None



gemini_service = GeminiService()
