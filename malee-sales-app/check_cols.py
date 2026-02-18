import sys
import os

# Add parent directory to path to import backend
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), '..')))

try:
    from backend.services.dataiku_service import dataiku_service
    
    DATASETS = ["join_data_cl_fill_prepared"]
    
    print("--- Checking Columns ---")
    for ds_name in DATASETS:
        try:
            print(f"\ndataset: {ds_name}")
            rows = dataiku_service.get_dataset_rows(ds_name, limit=1)
            if rows:
                cols = list(rows[0].keys())
                with open("cols_clean.txt", "w", encoding="utf-8") as f:
                    f.write(f"Columns count: {len(cols)}\n")
                    for c in cols:
                        f.write(f"COL: {c}\n")
                    f.write("\nSample Row:\n")
                    for k, v in rows[0].items():
                        f.write(f"{k}: {v} (type: {type(v)})\n")
                print("Written to cols_clean.txt")
            else:
                print("No rows found.")
        except Exception as e:
            print(f"Error reading {ds_name}: {e}")
except ImportError as e:
    print(f"Import Error: {e}")
except Exception as e:
    print(f"General Error: {e}")
