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
def model_dir(tmp_path_factory, dataset_path) -> str:
    """A throwaway artifact trained on the test dataset; also points the local model backend at it."""
    from backend.model.train import train_from_parquet

    out = tmp_path_factory.mktemp("model")
    train_from_parquet(dataset_path, out)
    os.environ["MODEL_BACKEND"] = "local"
    os.environ["MODEL_PATH"] = str(out)
    from backend.config import settings
    settings.MODEL_BACKEND, settings.MODEL_PATH = "local", str(out)
    return str(out)


@pytest.fixture(scope="session")
def client(dataset_path, model_dir, tmp_path_factory) -> TestClient:
    store_dir = str(tmp_path_factory.mktemp("store"))
    os.environ["SEED_RUN_ON_START"] = "0"  # tests assert on the Runs they create, not a seeded one
    os.environ["DATA_SOURCE"] = "local"
    os.environ["DATA_PATH"] = dataset_path
    os.environ["STORE_BACKEND"] = "local"
    os.environ["STORE_PATH"] = store_dir
    # backend.config may already be imported (test modules import services at collection), so patch it too
    from backend.config import settings
    from backend.data import loader
    from backend.store import service as store_service
    settings.SEED_RUN_ON_START = False
    settings.DATA_SOURCE, settings.DATA_PATH = "local", dataset_path
    settings.STORE_BACKEND, settings.STORE_PATH = "local", store_dir
    loader.clear_cache()
    store_service.reset()
    from backend.main import app

    with TestClient(app) as c:
        yield c
