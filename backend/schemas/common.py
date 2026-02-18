from typing import Generic, TypeVar, Optional, Any
from pydantic import BaseModel
from datetime import datetime

T = TypeVar("T")

class Meta(BaseModel):
    request_id: Optional[str] = None
    timestamp: datetime = datetime.now()

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None

class APIResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    meta: Meta = Meta()
    error: Optional[ErrorDetail] = None
