from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import logging

from ..schemas.common import APIResponse

router = APIRouter()
logger = logging.getLogger(__name__)


class PredictRequest(BaseModel):
    product_group: str
    flavor: str
    size: str
    year: int
    month: int
    promo_flag: int = 0
    promo_days_in_month: int = 0
    promo_discount_pct: float = 0  # 0-100 from frontend
    promo_type: str = "None"


class CompareRequest(BaseModel):
    product_group: str
    flavor: str
    size: str
    year: int
    month: int
    promo_days_in_month: int = 0
    promo_discount_pct: float = 0  # 0-100 from frontend
    promo_type: str = "None"


def _features(product_group, flavor, size, year, month, promo_flag, promo_days_in_month, promo_discount_pct, promo_type) -> dict:
    return {
        "product_group": product_group,
        "flavor": flavor,
        "size": size,
        "year": year,
        "month": month,
        "month_id": (year - 2021) * 12 + month,
        "promo_flag": promo_flag,
        "promo_days_in_month": promo_days_in_month,
        "promo_discount_pct": promo_discount_pct,  # 0-100, the Discount scale in CONTEXT.md and the dataset
        "promo_type": promo_type,
    }


def _predict(features: dict) -> dict:
    """Returns {"prediction": float, "explanations": {feature: contribution}}.

    Filled in by the forecast-model ticket; until then the Planner gets a clear 503.
    """
    raise HTTPException(status_code=503, detail="Model backend not configured")


@router.post("/single", response_model=APIResponse[Dict[str, Any]])
async def predict_single(req: PredictRequest):
    """Single prediction with explanations."""
    try:
        result = _predict(_features(
            req.product_group, req.flavor, req.size, req.year, req.month,
            req.promo_flag, req.promo_days_in_month, req.promo_discount_pct, req.promo_type,
        ))
        return APIResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Predict single error: {e}", exc_info=True)
        return APIResponse(success=False, error={"code": "PREDICT_ERROR", "message": str(e)})


@router.post("/compare", response_model=APIResponse[Dict[str, Any]])
async def predict_compare(req: CompareRequest):
    """Compare baseline (no Promotion) vs scenario (with Promotion). Returns both predictions + delta."""
    try:
        baseline = _predict(_features(req.product_group, req.flavor, req.size, req.year, req.month, 0, 0, 0, "None"))
        scenario = _predict(_features(
            req.product_group, req.flavor, req.size, req.year, req.month,
            1, req.promo_days_in_month, req.promo_discount_pct, req.promo_type,
        ))
        baseline_pred = baseline.get("prediction", 0)
        scenario_pred = scenario.get("prediction", 0)
        delta = scenario_pred - baseline_pred
        delta_pct = (delta / baseline_pred * 100) if baseline_pred > 0 else 0
        return APIResponse(
            success=True,
            data={
                "baseline": round(baseline_pred, 2),
                "scenario": round(scenario_pred, 2),
                "delta": round(delta, 2),
                "delta_pct": round(delta_pct, 2),
                "explanations": scenario.get("explanations", {}),
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Predict compare error: {e}", exc_info=True)
        return APIResponse(success=False, error={"code": "PREDICT_ERROR", "message": str(e)})
