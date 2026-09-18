"""Structured logging: one JSON object per line, plus a request log with path, status and duration."""
from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone

STANDARD = set(logging.LogRecord("x", 0, "", 0, "", (), None).__dict__) | {"message", "asctime"}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        obj = {
            "time": datetime.fromtimestamp(record.created, timezone.utc).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        obj.update({k: v for k, v in record.__dict__.items() if k not in STANDARD and not k.startswith("_")})
        if record.exc_info:
            obj["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(obj, ensure_ascii=False, default=str)


def configure_logging(level: int = logging.INFO) -> None:
    root = logging.getLogger()
    root.setLevel(level)
    for h in list(root.handlers):
        root.removeHandler(h)
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root.addHandler(handler)
    logging.getLogger("uvicorn.access").disabled = True  # the request middleware logs instead


request_logger = logging.getLogger("backend.request")


async def log_requests(request, call_next):
    """Starlette middleware: one line per request with path, status and duration."""
    started = time.perf_counter()
    response = await call_next(request)
    request_logger.info(
        "request",
        extra={
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": round((time.perf_counter() - started) * 1000, 1),
        },
    )
    return response
