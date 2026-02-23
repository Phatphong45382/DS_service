# 🍍 Malee Demand Forecasting Platform — Architecture Flow

> **สำหรับทีม Sales**: เอกสารนี้อธิบาย flow การทำงานของระบบ ทั้งในระดับ High-Level (ภาพรวม) และ Low-Level (รายละเอียดการทำงานภายใน)

---

## 📐 High-Level Architecture

ระบบแบ่งออกเป็น **3 ชั้น (3-Tier Architecture)** ที่สื่อสารกันผ่าน API

```mermaid
graph LR
    User(["👤 Business User\n(Sales / Planning Team)"])

    subgraph FE["🖥️ Frontend Layer\n(Next.js / React)"]
        direction TB
        P1["📊 Dashboard\n(Overview & Analytics)"]
        P2["🔮 Forecast\n(New Prediction)"]
        P3["🎯 Scenario Planner\n(Promo Simulation)"]
        P4["📋 Run History\n(Audit & Results)"]
    end

    subgraph BE["⚙️ Backend Layer\n(Python / FastAPI)"]
        direction TB
        R1["Analytics Router"]
        R2["Scoring Router"]
        R3["Dashboard Router"]
    end

    subgraph DS["🧠 Dataiku DSS\n(AI/ML Platform)"]
        direction TB
        D1["📁 Managed Folders\n(Input / Output CSV)"]
        D2["🤖 ML Scenarios\n(LightGBM + Prophet)"]
        D3["📦 Datasets\n(Historical Data)"]
    end

    User -->|"ใช้งานผ่าน Browser"| FE
    FE -->|"REST API (HTTP/JSON)"| BE
    BE -->|"Dataiku Python API"| DS

    style FE fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
    style BE fill:#dcfce7,stroke:#16a34a,color:#14532d
    style DS fill:#f3e8ff,stroke:#9333ea,color:#581c87
```

### 🗺️ Component Summary

| Layer | Technology | หน้าที่หลัก |
|-------|-----------|------------|
| **Frontend** | React 19, Next.js 16, TypeScript, Tailwind CSS, Recharts | UI / UX, Data Visualization, User Interaction |
| **Backend** | Python FastAPI, Uvicorn, Pandas | Business Logic, API Gateway, Data Processing |
| **Dataiku DSS** | LightGBM, Prophet, Managed Folders | ML Model Training & Inference, Data Storage |

---

## 🔄 Low-Level Flow — Forecast Execution (New Prediction)

flow หลักที่ใช้เวลา user อยากรัน forecast ใหม่ด้วยข้อมูลของตัวเอง

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User
    participant FE as 🖥️ Frontend<br/>(Next.js)
    participant BE as ⚙️ Backend<br/>(FastAPI)
    participant DK as 🧠 Dataiku DSS

    User->>FE: Upload ไฟล์ CSV (ข้อมูลยอดขาย)
    FE->>FE: Validate ไฟล์ (ชนิด, ขนาด, columns)
    FE->>BE: POST /api/v1/scoring/upload
    BE->>DK: Upload CSV → Managed Folder (input_data.csv)
    DK-->>BE: ✅ Upload Success
    BE-->>FE: 200 OK

    FE->>BE: POST /api/v1/scoring/run/{scenario_id}
    BE->>DK: Trigger ML Scenario (LightGBM + Prophet)
    DK-->>BE: Run ID
    BE-->>FE: 200 OK + Run ID

    Note over FE,DK: ⏳ รอ 40 วินาที (ML Processing)

    FE->>BE: GET /api/v1/scoring/results/latest
    BE->>DK: Fetch Output CSV จาก Results Folder
    DK-->>BE: Raw CSV Data
    BE->>BE: Parse & Format JSON
    BE-->>FE: JSON (Forecast Data)
    FE->>User: 📈 แสดง Forecast Chart + Run Report
```

---

## 📊 Low-Level Flow — Analytics & Dashboard

flow สำหรับการดู KPI และวิเคราะห์ความแม่นยำของโมเดล (ไม่ต้องรัน ML ใหม่)

```mermaid
sequenceDiagram
    autonumber
    actor User as 👤 User
    participant FE as 🖥️ Frontend<br/>(Next.js)
    participant BE as ⚙️ Backend<br/>(FastAPI)
    participant DK as 🧠 Dataiku DSS

    User->>FE: เลือก Filter (Product Group, Flavor, Region, Date)
    FE->>BE: GET /api/v1/analytics/filters
    BE->>DK: Query Datasets (unique values)
    DK-->>BE: Filter Options
    BE-->>FE: JSON (cascading filter options)
    FE->>User: แสดง Dropdown Filters

    User->>FE: Apply Filter & View Dashboard
    FE->>BE: GET /api/v1/analytics/summary?product=...&date=...
    BE->>DK: Query Historical Sales Dataset
    DK-->>BE: Aggregated Sales Data
    BE->>BE: คำนวณ KPI (WAPE, Bias, Total)
    BE-->>FE: JSON (KPIs + Trend Data)
    FE->>User: 📊 แสดง KPI Cards + Charts

    User->>FE: Deep Dive → Accuracy Analysis
    FE->>BE: GET /api/v1/analytics/deep-dive
    BE->>DK: Query Forecast vs Actual Dataset
    DK-->>BE: Accuracy Data per SKU
    BE->>BE: คำนวณ WAPE/Bias per Product/Region
    BE-->>FE: JSON (Heatmap + Rankings)
    FE->>User: 🎯 แสดง Accuracy Heatmap + Rankings
```

---

## 🎯 Low-Level Flow — Scenario Planner (Local Simulation)

flow สำหรับจำลองผลกระทบของ Promotion (ทำงาน **Local** ไม่ต้องผ่าน Backend ทุกครั้ง)

```mermaid
flowchart TD
    A(["👤 User เปิด Scenario Planner"]) --> B["Load baseline forecast\nจาก GET /analytics/summary"]
    B --> C["แสดง Baseline Chart\n(ยอดขายที่คาดการณ์ไว้)"]

    C --> D{{"User ปรับ Promotional Levers"}}
    D --> E["📉 Discount % ที่จะให้"]
    D --> F["📅 ระยะเวลา Promotion (เดือน)"]
    D --> G["🏷️ เลือก Product / Region"]

    E & F & G --> H["⚡ Local Calculation\n(Frontend คำนวณเอง)\nใช้ Historical Price Elasticity"]
    H --> I["คำนวณ Volume Impact\nDiscount × Elasticity × Duration"]
    I --> J["📈 แสดง Projected Chart\n(Baseline vs Simulated)"]

    J --> K{{"User พอใจ?"}}
    K -->|"ปรับอีกครั้ง"| D
    K -->|"Export / บันทึก"| L["📥 Export ผลลัพธ์ (CSV/PDF)"]
```

---

## 🏛️ Full System Map (Component Diagram)

```mermaid
graph TB
    subgraph User["👤 End Users"]
        U1["Sales Manager"]
        U2["Planning Team"]
        U3["Business Analyst"]
    end

    subgraph Frontend["🖥️ Frontend — Next.js App (Port 3000)"]
        Page1["/ Overview\nSales Summary Dashboard"]
        Page2["/analytics\nForecast Accuracy Deep Dive"]
        Page3["/new-prediction\nRun New Forecast"]
        Page4["/scenario-planner\nPromo Simulation"]
        Page5["/runs & /runs/id\nRun History & Report"]
        Page6["/settings\nSystem Configuration"]
        Lib["lib/api-client.ts\n(Typed API Layer)"]
    end

    subgraph Backend["⚙️ Backend — FastAPI (Port 8080)"]
        API["FastAPI App\n/api/v1/"]
        RA["analytics router\n/analytics/summary\n/analytics/deep-dive\n/analytics/filters"]
        RD["dashboard router\n/dashboard/summary\n/dashboard/filters"]
        RS["scoring router\n/scoring/upload\n/scoring/run/:id\n/scoring/results/latest"]
        SVC["dataiku_service.py\n(Dataiku API Wrapper)"]
    end

    subgraph Dataiku["🧠 Dataiku DSS (ML Platform)"]
        F1["📁 Input Folder\n(input_data.csv)"]
        F2["📁 Output Folder\n(forecast results)"]
        ML["🤖 ML Scenario\nLightGBM + Prophet"]
        DB1["📊 Historical Sales\nDataset"]
        DB2["📊 Forecast vs Actual\nDataset"]
    end

    User -->|"Browser"| Frontend
    Frontend --> Lib
    Lib -->|"HTTP REST"| API
    API --> RA & RD & RS
    RA & RD & RS --> SVC
    SVC -->|"Dataiku Python API"| Dataiku
    RS -->|Upload| F1
    RS -->|Trigger| ML
    ML -->|Output| F2
    RS -->|Fetch| F2
    RA & RD -->|Query| DB1 & DB2
```

---

## 💡 Key Value Propositions (สำหรับ Sales Pitch)

| Feature | What it does | Business Value |
|---------|-------------|----------------|
| 🔮 **Demand Forecasting** | รัน ML model ด้วย LightGBM + Prophet บน Dataiku | ลด Overstock / Stockout ด้วย AI |
| 📊 **Accuracy Analytics** | วัด WAPE & Bias แบบ real-time ตาม SKU / Region | ติดตามประสิทธิภาพโมเดลได้ตลอด |
| 🎯 **Scenario Planner** | จำลองผลจาก Promotion ก่อนตัดสินใจ | ช่วย Trade Marketing วางแผน Promotion |
| 📋 **Run History** | เก็บประวัติการรัน Forecast พร้อม Report | Audit trail ครบถ้วน |
| 🔗 **Dataiku Integration** | ต่อตรงกับ Dataiku DSS ผ่าน API | ใช้ Data Science Platform ที่มีอยู่ได้ทันที |
