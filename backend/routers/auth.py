"""The door: one password in, one 12-hour token out."""
from fastapi import APIRouter
from pydantic import BaseModel

from .. import auth
from ..schemas.common import APIResponse

router = APIRouter()


class LoginRequest(BaseModel):
    password: str


@router.post("/login", response_model=APIResponse[dict])
async def login(body: LoginRequest):
    if not auth.enabled():
        return APIResponse(success=True, data={"token": "", "expires_at": 0, "auth_required": False})
    if not auth.check_password(body.password):
        return APIResponse(success=False, error={"code": "BAD_PASSWORD", "message": "Wrong password"})
    return APIResponse(success=True, data={**auth.mint(), "auth_required": True})
