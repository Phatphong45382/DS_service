
import os
import sys

# Add current directory to path so we can import backend modules
sys.path.append(os.getcwd())

from backend.config import settings
from backend.services.dataiku_service import dataiku_service

def debug_dataset():
    dataset_name = settings.DATASET_ANALYTICS_DASHBOARD
    print(f"Inspecting Dataset: {dataset_name}")
    
    try:
        rows = dataiku_service.get_dataset_rows(dataset_name)
        print(f"Total Rows: {len(rows)}")
        
        if rows:
            print("\nColumns found in first row:")
            print(list(rows[0].keys()))
            
            print("\nSample Data (First 5 rows):")
            for i, row in enumerate(rows[:5]):
                print(f"Row {i}:")
                print(f"  has_promotion: {row.get('has_promotion')}")
                print(f"  discount_pct: {row.get('discount_pct')}")
                print(f"  Promo_Days: {row.get('Promo_Days')}")
                print(f"  Existing Keys starting with 'Promo': {[k for k in row.keys() if 'Promo' in k]}")
                print("-" * 30)
                
            # Check for non-zero values
            promo_days_values = [float(r.get('Promo_Days') or 0) for r in rows if r.get('Promo_Days')]
            discount_values = [float(r.get('discount_pct') or 0) for r in rows if r.get('discount_pct')]
            
            print(f"\nNon-zero Promo_Days count: {len([x for x in promo_days_values if x > 0])}")
            print(f"Max Promo_Days: {max(promo_days_values) if promo_days_values else 0}")
            print(f"Avg Promo_Days (of non-zero): {sum(promo_days_values)/len(promo_days_values) if promo_days_values else 0}")
            
            print(f"\nNon-zero discount_pct count: {len([x for x in discount_values if x > 0])}")
            print(f"Max discount_pct: {max(discount_values) if discount_values else 0}")
            print(f"Avg discount_pct (of non-zero): {sum(discount_values)/len(discount_values) if discount_values else 0}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_dataset()
