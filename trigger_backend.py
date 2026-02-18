
import requests

try:
    print("Triggering backend...")
    response = requests.get("http://127.0.0.1:8000/api/v1/analytics/summary")
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Success! Backend hit.")
    else:
        print(f"Failed: {response.text}")
except Exception as e:
    print(f"Error: {e}")
