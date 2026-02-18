from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import logging

from ..services.dataiku_service import dataiku_service
from ..schemas.common import APIResponse

router = APIRouter()
logger = logging.getLogger(__name__)

# New Dataset Configuration
NEW_DATASET_NAME = "join_data_cl_fill_prepared"

@router.get("/test-connection")
async def test_new_dataset_connection():
    """
    Test endpoint to verify connection to new dataset: join_data_cl_fill_prepared
    Expected 18 columns:
    - Customer
    - Product_Group
    - Flavor
    - Size
    - date
    - has_promotion
    - promotion_dt
    - MechGroup
    - discount_pct
    - Actual_sale
    - Planed_sales_from_start
    - Under_plan_risk
    - Over_plan_risk
    - error
    - abs_error
    - bias_pct
    - F1
    - F2
    """
    try:
        logger.info(f"Testing connection to dataset: {NEW_DATASET_NAME}")
        
        # Fetch first 5 rows to verify connection
        rows = dataiku_service.get_dataset_rows(NEW_DATASET_NAME, limit=5)
        
        # Get column names from first row
        columns = list(rows[0].keys()) if rows else []
        
        return APIResponse(
            success=True, 
            data={
                "dataset_name": NEW_DATASET_NAME,
                "total_rows_fetched": len(rows),
                "columns_count": len(columns),
                "columns": columns,
                "sample_rows": rows
            }
        )
    except Exception as e:
        logger.error(f"Failed to connect to dataset {NEW_DATASET_NAME}: {e}", exc_info=True)
        return APIResponse(
            success=False, 
            error={
                "code": "CONNECTION_ERROR", 
                "message": f"Failed to connect to dataset: {str(e)}"
            }
        )

@router.get("/test-full-schema")
async def test_dataset_schema():
    """
    Get full schema information of the new dataset
    """
    try:
        logger.info(f"Fetching schema for dataset: {NEW_DATASET_NAME}")
        
        # Get project and dataset
        project = dataiku_service.project
        dataset = project.get_dataset(NEW_DATASET_NAME)
        
        # Get schema
        schema = dataset.get_schema()
        
        return APIResponse(
            success=True,
            data={
                "dataset_name": NEW_DATASET_NAME,
                "schema": schema
            }
        )
    except Exception as e:
        logger.error(f"Failed to get schema: {e}", exc_info=True)
        return APIResponse(
            success=False,
            error={
                "code": "SCHEMA_ERROR",
                "message": str(e)
            }
        )
