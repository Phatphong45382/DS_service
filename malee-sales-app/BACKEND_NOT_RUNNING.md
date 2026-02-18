# 🚨 Backend Not Running - Quick Fix

## Problem
The upload failed because the FastAPI backend is not running on port 8000.

## Solution

### Option 1: Start Backend in New Terminal (Recommended)

1. **Open a NEW PowerShell/Command Prompt window**
2. **Run these commands:**

```powershell
cd c:\work\pre_sale\DS_service\Malee
py -m uvicorn app:app --reload --port 8000
```

3. **Wait for this message:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

4. **Keep this terminal window open** (don't close it)

5. **Go back to your browser** and try uploading again

---

### Option 2: Check if Backend is Already Running

Maybe the backend is running on a different port? Check:

```powershell
netstat -ano | findstr :8000
```

If you see output, the port is in use. You may need to:
- Find and close the existing process
- Or change the port in `.env.local`

---

## Verify Backend is Working

Open browser and go to:
```
http://localhost:8000/health
```

You should see:
```json
{
  "status": "healthy",
  "dataiku_host": "http://sscinas.myqnapcloud.com:11001",
  "project_key": "MALEE_NEW",
  "folder_id": "OztgS7aU"
}
```

---

## Common Issues

### Issue 1: "py: command not found"
**Solution:** Use `python` instead of `py`:
```bash
python -m uvicorn app:app --reload --port 8000
```

### Issue 2: "No module named 'uvicorn'"
**Solution:** Install dependencies:
```bash
cd c:\work\pre_sale\DS_service\Malee
py -m pip install -r requirements_api.txt
```

### Issue 3: Port 8000 already in use
**Solution:** Kill the process or use different port:
```bash
# Find process using port 8000
netstat -ano | findstr :8000

# Kill it (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or use different port
py -m uvicorn app:app --reload --port 8001
# Then update .env.local: NEXT_PUBLIC_API_URL=http://localhost:8001
```

---

## After Starting Backend

1. ✅ Backend running on http://localhost:8000
2. ✅ Frontend running on http://localhost:3000
3. 🎯 Try uploading CSV file again
4. 📊 Check Dataiku folder for uploaded file

---

## Need Help?

Check the logs in the backend terminal for error messages.
