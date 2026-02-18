
import os
import sys
import json
import pandas as pd

# Add current directory to path
sys.path.append(os.getcwd())

from backend.config import settings
from backend.services.dataiku_service import dataiku_service

def inspect():
    try:
        dataset_name = settings.DATASET_ANALYTICS_DASHBOARD
        print(f"Inspecting dataset: {dataset_name}")
        
        rows = dataiku_service.get_dataset_rows(dataset_name)
        
        if not rows:
            print("No rows found!")
            return

        columns = list(rows[0].keys())
        sample_row = rows[0]
        
        # Look for potential promo columns
        promo_candidates = [k for k in columns if "promo" in k.lower() or "day" in k.lower() or "dur" in k.lower()]
        
        output = {
            "columns": columns,
            "sample_row": sample_row,
            "promo_candidates": promo_candidates
        }
        
        with open("columns.json", "w") as f:
            json.dump(output, f, indent=2, default=str)
            
        print("Successfully wrote columns.json")
        
    except Exception as e:
        print(f"Error: {e}")
        with open("columns_error.txt", "w") as f:
            f.write(str(e))

if __name__ == "__main__":
    inspect()
