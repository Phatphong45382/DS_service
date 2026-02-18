import sys
import os
from datetime import datetime

# Add parent directory to path to import backend
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), '..')))

try:
    from backend.services.dataiku_service import dataiku_service
    from backend.config import settings
    
    dataset_name = settings.DATASET_ANALYTICS_DASHBOARD
    print(f"Reading dataset: {dataset_name}")
    
    rows = dataiku_service.get_dataset_rows(dataset_name)
    print(f"Total rows: {len(rows)}")
    
    monthly_stats = {} # (year, month) -> {actual: 0.0, planned: 0.0}
    
    for row in rows:
        try:
            date_val = row.get("date")
            if not date_val: continue
            
            r_year, r_month = 0, 0
            if isinstance(date_val, datetime):
                r_year, r_month = date_val.year, date_val.month
            else:
                s_val = str(date_val).replace('T', ' ').split(' ')[0]
                dt = datetime.strptime(s_val, "%Y-%m-%d")
                r_year, r_month = dt.year, dt.month
                
            actual = float(row.get("Actual_sale") or 0)
            planned = float(row.get("Planed_sales_from_start") or 0)
            
            key = (r_year, r_month)
            if key not in monthly_stats:
                monthly_stats[key] = {"actual": 0.0, "planned": 0.0}
            
            monthly_stats[key]["actual"] += actual
            monthly_stats[key]["planned"] += planned
            
        except Exception:
            continue
            
    print("\nMonthly Stats (Year-Month | Actual | Planned):")
    sorted_keys = sorted(monthly_stats.keys())
    for y, m in sorted_keys:
        stats = monthly_stats[(y, m)]
        print(f"{y}-{m:02d} | {stats['actual']:,.2f} | {stats['planned']:,.2f}")
        
except Exception as e:
    print(f"Error: {e}")
