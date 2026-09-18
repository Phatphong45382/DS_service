"""HTTP seam: the real FastAPI app with every backend set to local.

Env must be set before backend.config is imported, so the app is imported inside the fixture.
"""
import os

import pytest
from fastapi.testclient import TestClient

from backend.data.generator import generate

SEED, END_MONTH = 42, "2026-08"


@pytest.fixture(scope="session")
def dataset_path(tmp_path_factory) -> str:
    path = tmp_path_factory.mktemp("data") / "sales.parquet"
    generate(seed=SEED, end_month=END_MONTH).to_parquet(path, index=False)
    return str(path)


@pytest.fixture(scope="session")
def client(dataset_path) -> TestClient:
    os.environ["DATA_SOURCE"] = "local"
    os.environ["DATA_PATH"] = dataset_path
    from backend.main import app

    with TestClient(app) as c:
        yield c
