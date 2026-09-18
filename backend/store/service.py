"""The one place stateful things are kept: Runs, uploads, documents, editable prompts.

A tiny key/value blob interface — keys look like paths ("runs/<id>/record.json") — so the
local implementation is a directory and the AWS one (S3 for blobs, DynamoDB for records) can
sit behind the same four calls. Nothing stateful lives in process memory.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from ..config import settings


class LocalStore:
    def __init__(self, root: str | Path):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        p = self.root / key
        p.parent.mkdir(parents=True, exist_ok=True)
        return p

    def put_json(self, key: str, obj: Any) -> None:
        self._path(key).write_text(json.dumps(obj, ensure_ascii=False, default=_jsonable), encoding="utf-8")

    def get_json(self, key: str) -> Any | None:
        p = self.root / key
        return json.loads(p.read_text(encoding="utf-8")) if p.exists() else None

    def put_bytes(self, key: str, data: bytes) -> None:
        self._path(key).write_bytes(data)

    def get_bytes(self, key: str) -> bytes | None:
        p = self.root / key
        return p.read_bytes() if p.exists() else None

    def list_keys(self, prefix: str) -> list[str]:
        base = self.root / prefix
        if not base.exists():
            return []
        return sorted(str(p.relative_to(self.root)).replace("\\", "/") for p in base.rglob("*") if p.is_file())


def _jsonable(o):
    """numpy scalars and Timestamps -> plain JSON."""
    if hasattr(o, "item"):
        return o.item()
    if hasattr(o, "isoformat"):
        return o.isoformat()
    raise TypeError(f"not JSON serialisable: {type(o).__name__}")


@lru_cache(maxsize=1)
def get_store():
    if settings.STORE_BACKEND == "local":
        return LocalStore(settings.STORE_PATH)
    if settings.STORE_BACKEND == "aws":
        raise NotImplementedError("STORE_BACKEND=aws is delivered by the AWS backends ticket")
    raise ValueError(f"Unknown STORE_BACKEND {settings.STORE_BACKEND!r}")


def reset() -> None:
    """Drop the cached handle (tests use this to prove nothing lives in memory)."""
    get_store.cache_clear()
