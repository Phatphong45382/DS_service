"""The one place stateful things are kept: Runs, uploads, documents, editable prompts.

A tiny key/value blob interface — keys look like paths ("runs/<id>/record.json") — so the
local implementation is a directory and the AWS one (S3 for blobs, DynamoDB for records) can
sit behind the same four calls. Nothing stateful lives in process memory.
"""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any

from ..config import settings

logger = logging.getLogger(__name__)


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


# A DynamoDB item must stay under 400 KB. Records (a Run, an upload's metadata) are a couple of
# kilobytes; a Forecast is hundreds. Anything over this goes to S3 and the item becomes a pointer,
# so list_keys still sees it and callers never learn the difference.
INLINE_LIMIT = 64 * 1024


class AwsStore:
    """Records in one DynamoDB table (pk = top-level prefix, sk = the rest of the key), blobs in S3."""

    def __init__(self, bucket: str, table: str):
        if not bucket:
            raise ValueError("STORE_BACKEND=aws needs S3_BUCKET")
        from ..aws import client
        self.bucket, self.table = bucket, table
        self.s3 = client("s3", read_timeout=30)
        self.ddb = client("dynamodb")

    @staticmethod
    def _split(key: str) -> tuple[str, str]:
        head, _, rest = key.partition("/")
        return head, rest or head

    def put_json(self, key: str, obj: Any) -> None:
        body = json.dumps(obj, ensure_ascii=False, default=_jsonable)
        pk, sk = self._split(key)
        if len(body.encode()) > INLINE_LIMIT:
            self.put_bytes(key, body.encode())
            item = {"pk": {"S": pk}, "sk": {"S": sk}, "s3": {"BOOL": True}}
        else:
            item = {"pk": {"S": pk}, "sk": {"S": sk}, "body": {"S": body}}
        self.ddb.put_item(TableName=self.table, Item=item)

    def get_json(self, key: str) -> Any | None:
        pk, sk = self._split(key)
        item = self.ddb.get_item(TableName=self.table, Key={"pk": {"S": pk}, "sk": {"S": sk}}).get("Item")
        if not item:
            return None
        if item.get("s3", {}).get("BOOL"):
            data = self.get_bytes(key)
            return json.loads(data) if data else None
        return json.loads(item["body"]["S"])

    def put_bytes(self, key: str, data: bytes) -> None:
        self.s3.put_object(Bucket=self.bucket, Key=key, Body=data)

    def get_bytes(self, key: str) -> bytes | None:
        try:
            return self.s3.get_object(Bucket=self.bucket, Key=key)["Body"].read()
        except self.s3.exceptions.NoSuchKey:
            return None

    def list_keys(self, prefix: str) -> list[str]:
        pk, rest = self._split(prefix)
        rest = "" if rest == pk else rest
        keys = set()
        # DynamoDB rejects begins_with on an empty string, so only add it for a deeper prefix
        condition = "pk = :pk" + (" AND begins_with(sk, :sk)" if rest else "")
        values = {":pk": {"S": pk}} | ({":sk": {"S": rest}} if rest else {})
        for page in self.ddb.get_paginator("query").paginate(
            TableName=self.table,
            KeyConditionExpression=condition,
            ExpressionAttributeValues=values,
            ProjectionExpression="sk",
        ):
            keys.update(f"{pk}/{i['sk']['S']}" for i in page["Items"])
        for page in self.s3.get_paginator("list_objects_v2").paginate(Bucket=self.bucket, Prefix=prefix):
            keys.update(o["Key"] for o in page.get("Contents", []) if not o["Key"].endswith("/"))
        return sorted(keys)


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
        logger.info("Store: DynamoDB %s + s3://%s", settings.DYNAMODB_TABLE, settings.S3_BUCKET)
        return AwsStore(settings.S3_BUCKET, settings.DYNAMODB_TABLE)
    raise ValueError(f"Unknown STORE_BACKEND {settings.STORE_BACKEND!r}")


def reset() -> None:
    """Drop the cached handle (tests use this to prove nothing lives in memory)."""
    get_store.cache_clear()
