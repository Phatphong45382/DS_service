import sys
import os
from datetime import datetime

# Adjust path to reach backend module (one level up)
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), '..')))

from backend.services.dataiku_service import dataiku_service

DATASET_NAME = "join_data_cl_fill_prepared"

def run_debug():
    print(f"--- Debugging {DATASET_NAME} ---")
    try:
        rows = dataiku_service.get_dataset_rows(DATASET_NAME, limit=100)
        print(f"Fetched {len(rows)} rows.")
        
        if not rows:
            print("No rows returned!")
            return

        print("\nSample Data (First 3 rows):")
        for i, row in enumerate(rows[:3]):
            print(f"Row {i}: {row}")

        print("\nChecking Date Parsing and Values:")
        valid_dates = 0
        total_actual = 0.0
        
        for row in rows:
            date_str = row.get("date")
            actual = row.get("Actual_sale")
            
            parsed = "FAILED"
            try:
                if date_str:
                    # Logic from analytics.py:
                    dt = datetime.strptime(str(date_str).split('T')[0], "%Y-%m-%d")
                    parsed = dt.strftime("%Y-%m-%d")
                    valid_dates += 1
            except Exception as e:
                parsed = f"ERROR: {e}"
            
            print(f"Date: {date_str} -> {parsed} | Actual: {actual}")

        print(f"\nSummary:")
        print(f"Total Rows: {len(rows)}")
        print(f"Valid Dates: {valid_dates}")
        
    except Exception as e:
        print(f"Fatal Error: {e}")

if __name__ == "__main__":
    run_debug()
