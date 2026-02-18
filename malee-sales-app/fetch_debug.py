
import requests
import json
import os

def fetch_debug():
    url = "http://127.0.0.1:8080/api/v1/analytics/summary"
    try:
        print(f"Fetching {url}...")
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                meta = data['data']['meta']
                print("Success! Writing debug_meta.json...")
                with open("debug_meta.json", "w") as f:
                    json.dump(meta, f, indent=2)
            else:
                print(f"API Error: {data.get('error')}")
        else:
            print(f"HTTP Error: {response.status_code}")
            # Try port 8000 fallback
            url2 = "http://127.0.0.1:8000/api/v1/analytics/summary"
            print(f"Retrying connection to {url2}...")
            resp2 = requests.get(url2)
            if resp2.status_code == 200:
                 data = resp2.json()
                 with open("debug_meta.json", "w") as f:
                    json.dump(data['data']['meta'], f, indent=2)
            else:
                print(f"HTTP Error on 8000: {resp2.status_code}")

    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    fetch_debug()
