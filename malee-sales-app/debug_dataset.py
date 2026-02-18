
import os
import sys

# Add parent directory to path to access backend
current_dir = os.getcwd()
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

try:
    from backend.config import settings
    # Mock dataiku_service if needed or import it
    # Since we are running this as a script, we need to make sure backend modules are importable
    # We might need to mock 'dataiku' module if it's not installed in the environment or if it's a specific wrapper
    # But let's try importing the service first.
    from backend.services.dataiku_service import DataikuService
    
    # We need to instantiate it or use the singleton if it's exported
    from backend.services.dataiku_service import dataiku_service

    def debug_dataset():
        dataset_name = "Malee_Sales_Dashboard_Summary" # Hardcoded fallback or from settings
        if hasattr(settings, 'DATASET_ANALYTICS_DASHBOARD'):
            dataset_name = settings.DATASET_ANALYTICS_DASHBOARD
            
        print(f"Inspecting Dataset: {dataset_name}")
        
        try:
            rows = dataiku_service.get_dataset_rows(dataset_name)
            print(f"Total Rows: {len(rows)}")
            
            if rows:
                print("\nColumns found in first row:")
                keys = list(rows[0].keys())
                print(keys)
                
                # Check for Promo related columns
                promo_cols = [k for k in keys if 'promo' in k.lower()]
                print(f"\nPotential Promo Columns: {promo_cols}")
                
                # Check for Discount related columns
                disc_cols = [k for k in keys if 'discount' in k.lower()]
                print(f"Potential Discount Columns: {disc_cols}")
                
                print("\nSample Data (First 5 rows):")
                for i, row in enumerate(rows[:5]):
                    print(f"Row {i}:")
                    print(f"  has_promotion: {row.get('has_promotion')}")
                    print(f"  discount_pct: {row.get('discount_pct')}")
                    print(f"  Promo_Days: {row.get('Promo_Days')}")
                    print("-" * 30)

        except Exception as e:
            print(f"Error reading dataset: {e}")
            import traceback
            traceback.print_exc()

    if __name__ == "__main__":
        debug_dataset()

except ImportError as e:
    print(f"Import Error: {e}")
    print("Please make sure you are running this from 'malee-sales-app' directory and that 'backend' is in the parent directory.")
