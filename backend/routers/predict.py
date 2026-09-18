from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import logging

from ..schemas.common import APIResponse
from ..model.service import predict as model_predict
from ..data.loader import load_frame

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
    promo_type: str = "No Promotion"


class CompareRequest(BaseModel):
    product_group: str
    flavor: str
    size: str
    year: int
    month: int
    promo_days_in_month: int = 0
    promo_discount_pct: float = 0  # 0-100 from frontend
    promo_type: str = "No Promotion"


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


def _require_known_product(product_group: str, flavor: str, size: str) -> None:
    known = load_frame()[["Product_Group", "Flavor", "Size"]].drop_duplicates()
    if not ((known["Product_Group"] == product_group) & (known["Flavor"] == flavor) & (known["Size"] == size)).any():
        raise HTTPException(status_code=422, detail=f"Unknown Product: {product_group} / {flavor} / {size}")


def _predict(features: dict) -> dict:
    """One prediction with its interval and per-feature explanations (see model.service)."""
    (r,) = model_predict([features], explain=True)
    return {"prediction": r["prediction"], "p10": r["p10"], "p90": r["p90"],
            "explanations": r["explanations"], "base": r["base"]}


@router.post("/single", response_model=APIResponse[Dict[str, Any]])
async def predict_single(req: PredictRequest):
    """Single prediction with explanations."""
    try:
        _require_known_product(req.product_group, req.flavor, req.size)
        promo_flag = int(req.promo_type != "No Promotion")
        result = _predict(_features(
            req.product_group, req.flavor, req.size, req.year, req.month,
            promo_flag, req.promo_days_in_month, req.promo_discount_pct, req.promo_type,
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
        _require_known_product(req.product_group, req.flavor, req.size)
        promo_flag = int(req.promo_type != "No Promotion")
        baseline = _predict(_features(req.product_group, req.flavor, req.size, req.year, req.month, 0, 0, 0, "No Promotion"))
        scenario = _predict(_features(
            req.product_group, req.flavor, req.size, req.year, req.month,
            promo_flag, req.promo_days_in_month if promo_flag else 0, req.promo_discount_pct if promo_flag else 0, req.promo_type,
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
