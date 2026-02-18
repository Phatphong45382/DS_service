# Dataiku Integration - Setup Guide

## 🎯 Overview

ระบบนี้เชื่อมต่อหน้า **New Forecast Run** (Next.js) กับ **FastAPI Backend** เพื่ออัปโหลดไฟล์ CSV ไปยัง Dataiku Managed Folder

## 📋 Prerequisites

### 1. Backend (FastAPI)
- Python 3.8+
- Dependencies: `fastapi`, `uvicorn`, `dataiku-api-client`

### 2. Frontend (Next.js)
- Node.js 18+
- Next.js app running on port 3000

### 3. Dataiku Configuration
- **Host**: `REDACTED_HOST`
- **Project**: `MALEE_NEW`
- **Folder ID**: `OztgS7aU`

---

## 🚀 Quick Start

### Step 1: Start FastAPI Backend

```bash
cd c:\work\pre_sale\DS_service\Malee
py -m uvicorn app:app --reload --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

### Step 2: Verify Backend Health

Open browser or use curl:
```bash
curl http://localhost:8000/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "dataiku_host": "REDACTED_HOST",
  "project_key": "MALEE_NEW",
  "folder_id": "OztgS7aU"
}
```

### Step 3: Start Next.js Frontend

Frontend should already be running on port 3000. If not:
```bash
cd c:\work\pre_sale\DS_service\Malee\malee-sales-app
npm run dev
```

### Step 4: Test Upload

1. Open `http://localhost:3000/new-prediction`
2. Upload a CSV file
3. Check browser console for upload confirmation
4. Verify file appears in Dataiku Managed Folder

---

## 📁 Files Created

### Backend
- `app.py` - FastAPI server with upload endpoints
- Updated `FOLDER_ID` to `OztgS7aU`

### Frontend
- `.env.local` - Environment configuration
- `lib/api-client.ts` - API client for Dataiku backend
- `lib/types/dataiku.ts` - TypeScript type definitions
- Updated `components/upload/upload-panel.tsx` - Real upload logic
- Updated `app/new-prediction/page.tsx` - State management
- Updated `components/upload/forecast-config.tsx` - Receive upload result

---

## 🔧 API Endpoints

### Backend (FastAPI)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Check backend and Dataiku connection |
| `/upload` | POST | Upload CSV to Dataiku |
| `/list-files` | GET | List files in Dataiku folder |
| `/upload-and-run` | POST | Upload and trigger scenario |

### Frontend API Client

```typescript
import { uploadFileToDataiku, checkBackendHealth } from '@/lib/api-client';

// Upload file
const result = await uploadFileToDataiku(file);

// Check health
const health = await checkBackendHealth();
```

---

## 🧪 Testing

### Test 1: Backend Health
```bash
curl http://localhost:8000/health
```

### Test 2: List Files
```bash
curl http://localhost:8000/list-files
```

### Test 3: Upload via curl
```bash
curl -X POST "http://localhost:8000/upload" \
  -F "file=@data/sample.csv"
```

### Test 4: Upload via Web UI
1. Go to `http://localhost:3000/new-prediction`
2. Drag & drop or browse for CSV file
3. Check console logs for success message
4. Verify in Dataiku UI

---

## 🐛 Troubleshooting

### Error: "ไม่สามารถเชื่อมต่อกับ backend ได้"

**Solution:**
- Check if FastAPI is running on port 8000
- Run: `curl http://localhost:8000/health`

### Error: "Failed to connect to Dataiku"

**Solution:**
- Check Dataiku host is accessible
- Verify API key is valid
- Check network/firewall settings

### Error: "Upload failed"

**Solution:**
- Check file is CSV format
- Verify file size < 10MB
- Check backend logs for details

---

## 📊 Flow Diagram

```
User Browser
    ↓
    Upload CSV File
    ↓
Next.js Frontend (port 3000)
    ↓
    POST /upload
    ↓
FastAPI Backend (port 8000)
    ↓
    Dataiku API
    ↓
Dataiku Managed Folder (OztgS7aU)
```

---

## 🔐 Security Notes

- CORS is set to `allow_origins=["*"]` for development
- In production, update to specific origins
- API key is hardcoded - consider using environment variables
- Add authentication for production deployment

---

## 📝 Next Steps (Phase 2)

1. ✅ Upload file to Dataiku - **DONE**
2. ⏳ Trigger Dataiku Scenario
3. ⏳ Poll scenario status
4. ⏳ Fetch and display results
5. ⏳ Error handling for scenario failures

---

## 💡 Tips

- Keep both servers running during development
- Check browser console for detailed logs
- Use Dataiku UI to verify uploads
- Test with small CSV files first

---

## 📞 Support

If you encounter issues:
1. Check both server logs (FastAPI + Next.js)
2. Verify Dataiku credentials
3. Test backend endpoints directly with curl
4. Check browser console for errors
