# How to Run

## 1. Backend (FastAPI — port 8081)

```bash
cd c:\work\pre_sale\DS_service\Malee

# ติดตั้ง dependencies (ครั้งแรก)
pip install -r requirements.txt

# รัน backend
python start_backend.py
```

เปิดเบราว์เซอร์ไปที่ http://127.0.0.1:8081/docs เพื่อดู API docs

## 2. Frontend (Next.js — port 3000)

```bash
cd c:\work\pre_sale\DS_service\Malee\malee-sales-app

# ติดตั้ง dependencies (ครั้งแรก)
npm install

# รัน frontend
npm run dev
```

เปิดเบราว์เซอร์ไปที่ http://localhost:3000

## 3. Environment Variable (ถ้า port backend ไม่ใช่ 8081)

สร้างไฟล์ `malee-sales-app/.env.local`:

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8081
```

## สรุปลำดับการรัน

1. เปิด terminal แรก → `python start_backend.py`
2. เปิด terminal ที่สอง → `cd malee-sales-app && npm run dev`
3. เปิด http://localhost:3000
