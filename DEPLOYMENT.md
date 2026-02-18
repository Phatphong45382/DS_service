# Deployment Guide: Malee Sales App

This guide explains how to deploy the Malee Sales App (Next.js frontend + FastAPI backend).

## Prerequisites

- A GitHub repository with your code.
- Accounts on [Vercel](https://vercel.com) (for Frontend) and [Render](https://render.com) or [Railway](https://railway.app) (for Backend).

---

## 1. Backend Deployment (FastAPI)

We recommend using **Render** or **Railway** for the backend.

### Steps:
1.  **Create a New Web Service**: Link your GitHub repo.
2.  **Build Command**: `pip install -r requirements.txt`
3.  **Start Command**: `python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4.  **Environment Variables**: Add the following:
    - `DATAIKU_HOST`: `http://sscinas.myqnapcloud.com:11001`
    - `API_KEY`: `your-api-key`
    - `PROJECT_KEY`: `MALEE_NEW`
    - `PROJECT_KEY_DASHBOARD`: `MALEE_NEW`
    - `DATASET_DASHBOARD_SUMMARY`: `sale_data_final_1`
    - `FOLDER_ID`: `OztgS7aU`
    - `RESULTS_FOLDER_ID`: `pOjzy3fq`
    - `SCENARIO_ID`: `TEST`
    - `DATASET_NAME`: `sale_data_final_1`

---

## 2. Frontend Deployment (Next.js)

We recommend using **Vercel**.

### Steps:
1.  **Import Project**: Select your GitHub repo in Vercel.
2.  **Root Directory**: Set to `malee-sales-app`.
3.  **Environment Variables**:
    - `NEXT_PUBLIC_API_URL`: Use your backend's production URL (e.g., `https://your-backend.render.com/api/v1`).
4.  **Deploy**: Vercel will automatically build and deploy.

---

## 3. Production Considerations

### CORS Setup
In `app/main.py`, update the `allow_origins` to include your Vercel URL:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Static Files
The current backend mounts a `/static` folder. Ensure this folder exists in your repository or is handled by your deployment platform.

### Dataiku Access
Ensure the production server has network access to your Dataiku host (`sscinas.myqnapcloud.com`).
