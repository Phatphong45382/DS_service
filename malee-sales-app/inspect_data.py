
import os
import sys
import json

# Add parent directory to path to access backend
sys.path.append(os.path.dirname(os.getcwd()))

try:
    from backend.config import settings
    from backend.services.dataiku_service import dataiku_service

    dataset_name = settings.DATASET_ANALYTICS_DASHBOARD
    print(f"Inspecting dataset: {dataset_name}")
    
    rows = dataiku_service.get_dataset_rows(dataset_name)
    
    output = {}
    if rows and len(rows) > 0:
        sample_row = rows[0]
        columns = list(sample_row.keys())
        # Find candidates for Promo Days
        candidates = [col for col in columns if 'promo' in col.lower() or 'day' in col.lower() or 'dur' in col.lower()]
        
        output = {
            "columns": columns,
            "sample_row": sample_row,
            "candidates": candidates
        }
    else:
        output = {"error": "No rows found"}
    
    with open("columns.json", "w") as f:
        json.dump(output, f, indent=2, default=str)
        
    print("Clean inspection complete.")

except Exception as e:
    print(f"Error: {e}")
    with open("columns_error.txt", "w") as f:
        f.write(str(e))
