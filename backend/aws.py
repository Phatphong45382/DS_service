"""The one place boto3 clients are built.

Every client carries connect/read timeouts and a bounded retry count: a demo must fail visibly
in seconds, never hang on a socket while someone is talking over it. Credentials come from the
environment the way boto3 always finds them (AWS_PROFILE locally, the instance env on Render).
"""
from __future__ import annotations

from functools import lru_cache

import boto3
from botocore.config import Config

from .config import settings


@lru_cache(maxsize=None)
def client(service: str, read_timeout: int = 10, region: str | None = None):
    return boto3.client(
        service,
        region_name=region or settings.AWS_REGION,
        config=Config(
            connect_timeout=5,
            read_timeout=read_timeout,
            retries={"max_attempts": 2, "mode": "standard"},
        ),
    )


def reset() -> None:
    """Drop cached clients (tests and credential changes)."""
    client.cache_clear()
