from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import requests
import logging

from ..schemas.common import APIResponse
from ..services.data_masking import masker
from ..config import settings

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


def _build_dataiku_payload(
    product_group: str,
    flavor: str,
    size: str,
    year: int,
    month: int,
    promo_flag: int,
    promo_days_in_month: int,
    promo_discount_pct_ratio: float,
    promo_type: str,
) -> dict:
    month_id = (year - 2021) * 12 + (month - 1) + 1
    return {
        "features": {
            "product_group": product_group,
            "flavor": flavor,
            "size": size,
            "year": year,
            "month": month,
            "month_id": month_id,
            "promo_flag": promo_flag,
            "promo_days_in_month": promo_days_in_month,
            "promo_discount_pct": promo_discount_pct_ratio,
            "promo_type": promo_type,
        },
        "explanations": {
            "enabled": True,
            "method": "ICE",
            "nExplanations": 5,
        },
    }


def _call_dataiku(payload: dict) -> dict:
    try:
        resp = requests.post(
            settings.DATAIKU_PREDICT_URL,
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("result", data)
    except requests.exceptions.Timeout:
        raise HTTPException(status_code=504, detail="Dataiku prediction API timeout")
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=502, detail="Cannot connect to Dataiku prediction API")
    except Exception as e:
        logger.error(f"Dataiku predict error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/single", response_model=APIResponse[Dict[str, Any]])
async def predict_single(req: PredictRequest):
    """Single prediction with explanations."""
    try:
        # Unmask: frontend sends masked names, Dataiku needs real names
        real_pg = masker.unmask("product_group", req.product_group)
        real_fl = masker.unmask("flavor", req.flavor)
        payload = _build_dataiku_payload(
            product_group=real_pg,
            flavor=real_fl,
            size=req.size,
            year=req.year,
            month=req.month,
            promo_flag=req.promo_flag,
            promo_days_in_month=req.promo_days_in_month,
            promo_discount_pct_ratio=req.promo_discount_pct / 100,
            promo_type=req.promo_type,
        )
        result = _call_dataiku(payload)
        return APIResponse(success=True, data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Predict single error: {e}", exc_info=True)
        return APIResponse(success=False, error={"code": "PREDICT_ERROR", "message": str(e)})


@router.post("/compare", response_model=APIResponse[Dict[str, Any]])
async def predict_compare(req: CompareRequest):
    """Compare baseline (no promo) vs scenario (with promo). Returns both predictions + delta."""
    try:
        # Unmask: frontend sends masked names, Dataiku needs real names
        real_pg = masker.unmask("product_group", req.product_group)
        real_fl = masker.unmask("flavor", req.flavor)

        # Baseline: no promo
        baseline_payload = _build_dataiku_payload(
            product_group=real_pg,
            flavor=real_fl,
            size=req.size,
            year=req.year,
            month=req.month,
            promo_flag=0,
            promo_days_in_month=0,
            promo_discount_pct_ratio=0,
            promo_type="None",
        )
        baseline_result = _call_dataiku(baseline_payload)
        baseline_pred = baseline_result.get("prediction", 0)

        # Scenario: with promo
        scenario_payload = _build_dataiku_payload(
            product_group=real_pg,
            flavor=real_fl,
            size=req.size,
            year=req.year,
            month=req.month,
            promo_flag=1,
            promo_days_in_month=req.promo_days_in_month,
            promo_discount_pct_ratio=req.promo_discount_pct / 100,
            promo_type=req.promo_type,
        )
        scenario_result = _call_dataiku(scenario_payload)
        scenario_pred = scenario_result.get("prediction", 0)

        delta = scenario_pred - baseline_pred
        delta_pct = (delta / baseline_pred * 100) if baseline_pred > 0 else 0

        return APIResponse(
            success=True,
            data={
                "baseline": round(baseline_pred, 2),
                "scenario": round(scenario_pred, 2),
                "delta": round(delta, 2),
                "delta_pct": round(delta_pct, 2),
                "explanations": scenario_result.get("explanations", {}),
            },
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Predict compare error: {e}", exc_info=True)
        return APIResponse(success=False, error={"code": "PREDICT_ERROR", "message": str(e)})
