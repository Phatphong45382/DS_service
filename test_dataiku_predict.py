"""
Test script สำหรับทดสอบ Dataiku Prediction API
Usage: python test_dataiku_predict.py
"""

import requests
import json

API_URL = "http://192.168.100.16:12000/public/api/v1/demand1/model1/predict"

# ===== Test 1: ทดสอบ connection =====
print("=" * 60)
print("Test 1: Connection test")
print("=" * 60)

try:
    resp = requests.post(
        API_URL,
        json={
            "features": {
                "Flavor": "Orange",
                "Size": 200,
                "Product_Group": "Juice",
                "Customer": "Lotus",
                "Billing_Date_month": 6,
                "Billing_Date_year": 2026,
                "has_promotion": 1,
                "discount_pct": 20,
            }
        },
        timeout=15,
    )
    print(f"Status: {resp.status_code}")
    print(f"Response:\n{json.dumps(resp.json(), indent=2, ensure_ascii=False)}")
except requests.exceptions.ConnectionError:
    print("ERROR: เชื่อมต่อไม่ได้ — ตรวจสอบว่า Dataiku API node ทำงานอยู่")
except requests.exceptions.Timeout:
    print("ERROR: Timeout — API ใช้เวลานานเกินไป")
except Exception as e:
    print(f"ERROR: {e}")

# ===== Test 2: What-if comparison (มีโปร vs ไม่มีโปร) =====
print("\n" + "=" * 60)
print("Test 2: What-if comparison")
print("=" * 60)

base_features = {
    "Flavor": "Orange",
    "Size": 200,
    "Product_Group": "Juice",
    "Customer": "Lotus",
    "Billing_Date_month": 6,
    "Billing_Date_year": 2026,
    "has_promotion": 0,
    "discount_pct": 0,
}

scenario_features = {
    **base_features,
    "has_promotion": 1,
    "discount_pct": 20,
}

try:
    # Baseline (ไม่มีโปร)
    r1 = requests.post(API_URL, json={"features": base_features}, timeout=15)
    baseline = r1.json()
    print(f"Baseline (no promo):  {json.dumps(baseline, indent=2)}")

    # Scenario (มีโปร 20%)
    r2 = requests.post(API_URL, json={"features": scenario_features}, timeout=15)
    scenario = r2.json()
    print(f"Scenario (20% off):   {json.dumps(scenario, indent=2)}")

    # เปรียบเทียบ
    # NOTE: ต้องดู response structure ก่อนว่า prediction อยู่ field ไหน
    # แล้วค่อย uncomment ข้างล่าง
    #
    # base_qty = baseline["result"]["prediction"]
    # scen_qty = scenario["result"]["prediction"]
    # delta = scen_qty - base_qty
    # print(f"\nDelta: {delta:+,.0f} ({delta/base_qty*100:+.1f}%)")

except Exception as e:
    print(f"ERROR: {e}")

# ===== Test 3: ลองส่งแค่บาง features (ดูว่า API ต้องการอะไรบ้าง) =====
print("\n" + "=" * 60)
print("Test 3: Minimal features (ดูว่า required fields คืออะไร)")
print("=" * 60)

try:
    r3 = requests.post(
        API_URL,
        json={"features": {"Flavor": "Orange"}},
        timeout=15,
    )
    print(f"Status: {r3.status_code}")
    print(f"Response:\n{json.dumps(r3.json(), indent=2, ensure_ascii=False)}")
except Exception as e:
    print(f"ERROR: {e}")
