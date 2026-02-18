import requests
import json

url = "http://localhost:8080/api/v1/analytics/deep-dive"
params = {
    "year_from": 2023,
    "month_from": 1,
    "year_to": 2026,
    "month_to": 2
}

print(f"Calling {url} with params {params}")

try:
    response = requests.get(url, params=params)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Success: {data.get('success')}")
        if data.get('success'):
             metrics = data.get('data', {})
             kpi = metrics.get('kpi', {})
             trend = metrics.get('sales_trend', [])
             
             print(f"KPI: {json.dumps(kpi, indent=2)}")
             print(f"Trend len: {len(trend)}")
             if trend:
                 print(f"First Trend Point: {trend[0]}")
                 
             print(f"Meta: {metrics.get('meta')}")
        else:
             print(f"Error: {data.get('error')}")
    else:
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Exception: {e}")
