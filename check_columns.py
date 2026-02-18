import sys
from backend.services.dataiku_service import dataiku_service

DATASETS = ["sale_data_final_1", "join_data_cl_fill_prepared"]

def run():
    print("--- Checking Columns ---")
    for ds_name in DATASETS:
        try:
            print(f"\ndataset: {ds_name}")
            rows = dataiku_service.get_dataset_rows(ds_name, limit=1)
            if rows:
                cols = list(rows[0].keys())
                print(f"Columns ({len(cols)}): {cols}")
            else:
                print("No rows found.")
        except Exception as e:
            print(f"Error reading {ds_name}: {e}")

if __name__ == "__main__":
    run()
