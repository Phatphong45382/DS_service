from typing import Any, Dict, List, Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel, Field

from ..runs import service
from ..schemas.common import APIResponse

router = APIRouter()


class CreateRun(BaseModel):
    horizon: int = Field(6, ge=1, le=12)
    upload_id: Optional[str] = None
    notes: str = ""


@router.post("/upload", response_model=APIResponse[Dict[str, Any]])
async def upload_history(file: UploadFile = File(...)):
    """Store a sales-history CSV (canonical upload columns) and return its validation checks."""
    data = await file.read()
    try:
        return APIResponse(success=True, data=service.save_upload(file.filename or "upload.csv", data))
    except Exception as e:  # unreadable CSV
        raise HTTPException(status_code=422, detail=f"Could not read CSV: {e}")


@router.post("", response_model=APIResponse[Dict[str, Any]])
async def create_run(req: CreateRun):
    try:
        return APIResponse(success=True, data=service.create_run(req.horizon, req.upload_id, req.notes))
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Unknown upload {req.upload_id}")


@router.get("", response_model=APIResponse[List[Dict[str, Any]]])
async def list_runs():
    return APIResponse(success=True, data=service.list_runs())


@router.get("/compare", response_model=APIResponse[Dict[str, Any]])  # before /{run_id}
async def compare_runs(a: str, b: str):
    data = service.compare(a, b)
    if data is None:
        raise HTTPException(status_code=404, detail="One or both Runs not found")
    return APIResponse(success=True, data=data)


@router.get("/{run_id}", response_model=APIResponse[Dict[str, Any]])
async def get_run(run_id: str):
    run = service.get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    return APIResponse(success=True, data=run)


@router.get("/{run_id}/forecast", response_model=APIResponse[Dict[str, Any]])
async def get_run_forecast(run_id: str):
    data = service.get_forecast(run_id)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Run {run_id} has no Forecast")
    return APIResponse(success=True, data=data)
