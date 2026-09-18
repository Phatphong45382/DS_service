"""The one place the sales dataset is read from.

DATA_SOURCE=local reads the Parquet at DATA_PATH; DATA_SOURCE=s3 reads the same file from the
bucket (scripts/aws_deploy.py data puts it there).
The DataFrame is cached for five minutes; each call hands out fresh row dicts so callers
that annotate rows (the routers add _year/_month) never mutate the cache.
"""
from __future__ import annotations

import io
import logging
import time

import pandas as pd

from ..config import settings

logger = logging.getLogger(__name__)

CACHE_TTL = 300
_cache: dict[str, object] = {"df": None, "at": 0.0}


def _read() -> pd.DataFrame:
    if settings.DATA_SOURCE == "local":
        logger.info("Loading dataset from %s", settings.DATA_PATH)
        return pd.read_parquet(settings.DATA_PATH)
    if settings.DATA_SOURCE == "s3":
        # boto3 straight to bytes: pandas can read the buffer, so no s3fs/fsspec dependency
        logger.info("Loading dataset from s3://%s/%s", settings.S3_BUCKET, settings.S3_DATA_KEY)
        from ..aws import client
        body = client("s3", read_timeout=30).get_object(Bucket=settings.S3_BUCKET, Key=settings.S3_DATA_KEY)["Body"].read()
        return pd.read_parquet(io.BytesIO(body))
    raise ValueError(f"Unknown DATA_SOURCE {settings.DATA_SOURCE!r}")


def load_frame() -> pd.DataFrame:
    now = time.time()
    if _cache["df"] is None or now - _cache["at"] > CACHE_TTL:
        _cache["df"], _cache["at"] = _read(), now
    return _cache["df"]


def load_rows() -> list[dict]:
    return load_frame().to_dict("records")


def clear_cache() -> None:
    _cache["df"], _cache["at"] = None, 0.0
