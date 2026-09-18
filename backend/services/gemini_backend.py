"""Gemini behind the AI seam: today's behaviour, unchanged, wrapped as a backend."""
from __future__ import annotations

import logging
from typing import Optional

from google.genai import types
from google.genai.errors import ClientError

from ..config import settings
from .ai_service import EXTRACT_PROMPT, TIER_LABELS, ModelOption, QuotaExceededError
from .gemini_service import _parse_retry_delay, gemini_service

logger = logging.getLogger(__name__)


class GeminiBackend:
    name = "gemini"

    def current_model(self) -> str:
        return settings.GEMINI_MODEL

    def available_models(self) -> list[ModelOption]:
        # Tier wording only: the vendor and model id stay out of the UI by request; the id is still returned for switching.
        blurbs = ["quickest answers, lowest cost", "balanced speed and quality", "highest quality, slower"]
        return [ModelOption(i, label, b.capitalize()) for i, label, b in zip(settings.GEMINI_AVAILABLE_MODELS, TIER_LABELS, blurbs)]

    def set_model(self, model_id: str) -> None:
        settings.GEMINI_MODEL = model_id
        gemini_service._client = None
        from .agent_service import agent_service
        agent_service.reset_client()

    def describe(self) -> str:
        if not settings.GEMINI_API_KEY:
            return "gemini: no API key configured"
        return f"gemini {settings.GEMINI_MODEL} (timeout {settings.AI_TIMEOUT_SEC}s)"

    def generate(self, prompt: str, max_tokens: int = 1024) -> Optional[str]:
        try:
            response = gemini_service._call_generate(
                gemini_service._get_client(), settings.GEMINI_MODEL, prompt,
                types.GenerateContentConfig(max_output_tokens=max_tokens, temperature=0.7),
            )
            return response.text
        except ClientError as e:
            if e.code == 429:
                raise QuotaExceededError(_parse_retry_delay(e) or 60)
            logger.error(f"Gemini API error: {e}")
            return None
        except Exception as e:
            logger.error(f"Gemini API error: {e}", exc_info=True)
            return None

    def chat(self, messages: list[dict], system_prompt: str = "", max_tokens: int = 1024) -> Optional[str]:
        try:
            contents = [types.Content(role="user" if m["role"] == "user" else "model", parts=[types.Part.from_text(text=m["content"])]) for m in messages]
            response = gemini_service._call_generate(
                gemini_service._get_client(), settings.GEMINI_MODEL, contents,
                types.GenerateContentConfig(max_output_tokens=max_tokens, temperature=0.7, system_instruction=system_prompt or None),
            )
            return response.text
        except ClientError as e:
            if e.code == 429:
                raise QuotaExceededError(_parse_retry_delay(e) or 60)
            logger.error(f"Gemini Chat error: {e}")
            return None
        except Exception as e:
            logger.error(f"Gemini Chat error: {e}", exc_info=True)
            return None

    def ocr_image(self, image_bytes: bytes, mime_type: str = "image/png", custom_prompt: str = "", model: str = "") -> Optional[dict]:
        import asyncio
        return asyncio.run(gemini_service.ocr_image(image_bytes, mime_type, custom_prompt, model)) if not _in_loop() else _run_sync_coro(gemini_service.ocr_image(image_bytes, mime_type, custom_prompt, model))

    def extract_text(self, data: bytes, mime_type: str) -> Optional[str]:
        try:
            response = gemini_service._get_client().models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=[EXTRACT_PROMPT, types.Part.from_bytes(data=data, mime_type=mime_type)],
                config=types.GenerateContentConfig(max_output_tokens=8000, temperature=0.1),
            )
            return (response.text or "").strip()
        except ClientError as e:
            if e.code == 429:
                raise QuotaExceededError(_parse_retry_delay(e) or 60)
            logger.error(f"Gemini extract error: {e}")
            return None

    def agent_run(self, user_message: str, max_steps: int = 8) -> dict:
        from .agent_service import agent_service
        return _run_sync_coro(agent_service.run(user_message, max_steps=max_steps))


def _in_loop() -> bool:
    import asyncio
    try:
        asyncio.get_running_loop()
        return True
    except RuntimeError:
        return False


def _run_sync_coro(coro):
    """Run a coroutine to completion from sync code, whether or not a loop is already running."""
    import asyncio
    import concurrent.futures
    if not _in_loop():
        return asyncio.run(coro)
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
        return ex.submit(asyncio.run, coro).result()
