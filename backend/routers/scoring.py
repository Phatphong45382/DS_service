
from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Dict, Any
import logging
import io

from ..schemas.common import APIResponse
from ..services.dataiku_service import dataiku_service
from ..config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/upload", response_model=APIResponse[Dict[str, Any]])
async def upload_file(file: UploadFile = File(...)):
    """Upload a CSV file to the input folder."""
    try:
        content = await file.read()
        # file_stream = io.BytesIO(content) # Dataiku put_file takes stream or bytes? put_file(path, file)
        # Verify dataikuapi put_file signature. It usually takes a file-like object.
        
        result = dataiku_service.upload_file_to_folder(
            folder_id=settings.FOLDER_ID,
            remote_filename="input_data.csv", # Fixed name as per original app logic
            file_stream=io.BytesIO(content)
        )
        return APIResponse(success=True, data=result)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        return APIResponse(success=False, error={"code": "UPLOAD_ERROR", "message": str(e)})

@router.post("/run/{scenario_id}", response_model=APIResponse[Dict[str, str]])
async def run_scenario(scenario_id: str):
    """Trigger a scenario run."""
    try:
        run_id = dataiku_service.run_scenario(scenario_id)
        return APIResponse(success=True, data={"run_id": run_id, "scenario_id": scenario_id})
    except Exception as e:
        logger.error(f"Run scenario failed: {e}")
        return APIResponse(success=False, error={"code": "RUN_ERROR", "message": str(e)})

@router.get("/jobs/{scenario_id}/{run_id}", response_model=APIResponse[Dict[str, Any]])
async def get_job_status(scenario_id: str, run_id: str):
    """Get the status of a scenario run."""
    try:
        status = dataiku_service.get_scenario_run_status(scenario_id, run_id)
        return APIResponse(success=True, data=status)
    except Exception as e:
        logger.error(f"Get status failed: {e}")
        return APIResponse(success=False, error={"code": "STATUS_ERROR", "message": str(e)})

@router.get("/results/latest", response_model=APIResponse[Dict[str, Any]])
async def get_latest_results():
    """Get the latest forecast results."""
    try:
        # List files to find latest
        folder_contents = dataiku_service.list_folder_files(settings.RESULTS_FOLDER_ID)
        
        # Dataiku list_contents returns a dict with 'items' key containing the list
        if isinstance(folder_contents, dict) and 'items' in folder_contents:
            files = folder_contents['items']
        elif isinstance(folder_contents, list):
            files = folder_contents
        else:
            files = []

        if not files:
             return APIResponse(success=False, error={"code": "NO_RESULTS", "message": "No result files found in folder"})
        
        # Sort by lastModified
        # Dataiku list_contents returns list of dicts with 'path', 'lastModified'
        # But sometimes it might return strings (paths) if API differs
        if isinstance(files[0], str):
             # Assume filenames might contain timestamps or just pick one
             latest_file = sorted(files, reverse=True)[0]
             filename = latest_file
        else:
             latest_file = sorted(files, key=lambda x: x.get('lastModified', 0), reverse=True)[0]
             filename = latest_file['path']
             
        # path usually starts with /
        # filename = filename.lstrip('/')
        
        content = dataiku_service.read_file_from_folder(settings.RESULTS_FOLDER_ID, filename)
        
        # Parse CSV
        import csv
        reader = csv.DictReader(io.StringIO(content))
        data = list(reader)
        
        # DEBUG: Verify Oct 2023 (2566) value
        try:
            oct_2023_sum = 0.0
            for row in data:
                # Check for date column
                date_val = row.get('Date') or row.get('date')
                qty_val = row.get('Quantity_sum') or row.get('sales')
                
                if date_val and '2023-10' in date_val and qty_val:
                    oct_2023_sum += float(qty_val)
            
            logger.error(f"DEBUG: Sum for Oct 2023 (2023-10): {oct_2023_sum}")
        except Exception as e:
            logger.error(f"DEBUG: Failed to calc sum: {e}")

        return APIResponse(success=True, data={"filename": filename, "rows": data})
        
    except Exception as e:
        logger.error(f"Get results failed: {e}")
        return APIResponse(success=False, error={"code": "RESULT_ERROR", "message": str(e)})
