"""Readiness: every dependency with status and latency, plus the pre-demo model warm-up."""
import time

from fastapi import APIRouter

from ..auth import enabled as auth_enabled
from ..config import settings
from ..schemas.common import APIResponse

router = APIRouter()


def _timed(name: str, probe) -> dict:
    started = time.perf_counter()
    try:
        detail, status = probe()
    except Exception as e:  # a dependency that raises is exactly what this endpoint exists to show
        detail, status = f"{type(e).__name__}: {e}", "error"
    return {"name": name, "status": status, "latency_ms": round((time.perf_counter() - started) * 1000, 1), "detail": detail}


def _data():
    from ..data.loader import load_frame
    df = load_frame()
    return f"{len(df):,} rows from {settings.DATA_SOURCE}", "ok"


def _store():
    from ..store.service import get_store
    runs = [k for k in get_store().list_keys("runs/") if k.endswith("/record.json")]
    return f"{len(runs)} Runs in {settings.STORE_BACKEND} store", "ok"


def _model():
    from ..model.service import model_info
    info = model_info()
    if settings.MODEL_BACKEND != "sagemaker":
        return f"{info['version']} via {info['backend']}", "ok"
    # the endpoint's own status, without paying for an invocation - /health/warm does that
    from ..aws import client
    state = client("sagemaker", region=settings.SAGEMAKER_REGION).describe_endpoint(
        EndpointName=settings.SAGEMAKER_ENDPOINT)["EndpointStatus"]
    return f"endpoint {settings.SAGEMAKER_ENDPOINT} is {state}", "ok" if state == "InService" else "degraded"


def _ai():
    from ..services.ai_service import get_ai
    ai = get_ai()
    detail = ai.describe()
    return detail, "degraded" if "no API key" in detail else "ok"


@router.get("", response_model=APIResponse[dict])
async def health_check():
    deps = [_timed("data", _data), _timed("store", _store), _timed("model", _model), _timed("ai", _ai)]
    status = "ok" if all(d["status"] == "ok" for d in deps) else "degraded"
    return APIResponse(success=True, data={"status": status, "env": settings.ENV, "version": "1.0.0",
                                          "auth_required": auth_enabled(), "dependencies": deps})


@router.get("/warm", response_model=APIResponse[dict])
async def warm_model():
    """One real prediction: wakes a cold endpoint and reports how long it took."""
    from ..data.loader import load_frame
    from ..model.service import predict
    from ..model.train import NO_PROMOTION, month_id

    p = load_frame()[["Product_Group", "Flavor", "Size"]].iloc[0]
    row = {"product_group": p["Product_Group"], "flavor": p["Flavor"], "size": p["Size"], "year": 2026, "month": 1,
           "month_id": month_id(2026, 1), "promo_flag": 0, "promo_days_in_month": 0, "promo_discount_pct": 0, "promo_type": NO_PROMOTION}
    from ..model.service import model_info

    started = time.perf_counter()
    try:
        predict([row])
    except Exception as e:
        return APIResponse(success=False, error={"code": "MODEL_UNAVAILABLE", "message": f"{type(e).__name__}: {e}"})
    return APIResponse(success=True, data={
        "status": "warm", "backend": settings.MODEL_BACKEND,
        "served_by": model_info()["last_path"],  # "endpoint" or "fallback" when the endpoint is cold or gone
        "model_latency_ms": round((time.perf_counter() - started) * 1000, 1),
    })
