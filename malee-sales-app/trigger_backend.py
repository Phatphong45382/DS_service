
import requests

try:
    print("Triggering backend...")
    # Trying port 8000 (FastAPI default) and 8080 (Dataiku usually uses this or proxy)
    # The frontend uses port 8000 for backend based on previous logs? Or 8080?
    # Let's try 8000 first as it's common for uvicorn.
    url = "http://127.0.0.1:8000/api/v1/analytics/summary"
    print(f"GET {url}")
    response = requests.get(url)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Success! Backend hit.")
    else:
        print(f"Failed: {response.status_code} - {response.text[:200]}")

except Exception as e:
    print(f"Error on 8000: {e}")
    try:
        url = "http://127.0.0.1:8080/api/v1/analytics/summary"
        print(f"GET {url}")
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
    except Exception as e2:
        print(f"Error on 8080: {e2}")
