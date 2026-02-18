import urllib.request
import time

URL = "http://127.0.0.1:8080/docs"

def test_health():
    print(f"Checking backend health at {URL}")
    start_time = time.time()
    try:
        with urllib.request.urlopen(URL, timeout=5) as response:
            end_time = time.time()
            print(f"Status Code: {response.getcode()}")
            print(f"Time Taken: {end_time - start_time:.2f} seconds")
            print("Backend is ALIVE")
    except Exception as e:
        print(f"Backend seems DEAD or Unreachable: {e}")

if __name__ == "__main__":
    test_health()
