import urllib.request
import urllib.parse
import time
import json

URL = "http://127.0.0.1:8080/api/v1/analytics/deep-dive"
PARAMS = {
    "year_from": 2023,
    "month_from": 1,
    "year_to": 2026,
    "month_to": 2
}

def test_api():
    query_string = urllib.parse.urlencode(PARAMS)
    full_url = f"{URL}?{query_string}"
    
    print(f"Calling {full_url}")
    start_time = time.time()
    try:
        with urllib.request.urlopen(full_url) as response:
            end_time = time.time()
            duration = end_time - start_time
            
            print(f"Status Code: {response.getcode()}")
            print(f"Time Taken: {duration:.2f} seconds")
            
            data = json.loads(response.read().decode('utf-8'))
            if isinstance(data, dict) and 'data' in data:
                # Count items in data
                if data['data']:
                    print("Response Structure OK")
                    for k, v in data['data'].items():
                        if isinstance(v, list):
                            print(f" - {k}: {len(v)} items")
                        else:
                            print(f" - {k}: {type(v)}")
                else:
                    print("No data field")
            else:
                print("Response structure unexpected")
                
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} {e.reason}")
        print(e.read().decode('utf-8')[:500])
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_api()
