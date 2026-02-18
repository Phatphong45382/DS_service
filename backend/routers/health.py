
from fastapi import APIRouter
from ..schemas.common import APIResponse

router = APIRouter()

@router.get("", response_model=APIResponse[dict])
async def health_check():
    """Health check endpoint."""
    return APIResponse(success=True, data={"status": "ok", "version": "1.0.0"})
