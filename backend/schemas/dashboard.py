from typing import List, Union, Optional
from pydantic import BaseModel

class SalesData(BaseModel):
    year_month: str
    flavor: str
    size: Union[int, str]
    sales_qty: float
    channel: str

class DashboardResponse(BaseModel):
    sales_data: List[SalesData]
