# Malee Demand Forecasting — Production Architecture Flow

> เปรียบเทียบ Demo (ปัจจุบัน) vs Production (แนะนำ)

---

## High-Level: Demo vs Production

### Demo (ปัจจุบัน) — ทุกอย่างผ่าน Design Node

```mermaid
graph LR
    subgraph FRONTEND["Frontend: Next.js"]
        User["👤 User"]
        Dashboard["📊 Dashboard\n(Overview / Analytics)"]
        NewPred["🔮 New Prediction"]
        Upload["📤 Upload Data"]
    end

    subgraph BACKEND["Backend"]
        API["⚡ FastAPI\n/api/v1"]
    end

    subgraph DATAIKU["Backend: Dataiku Design Node"]
        DN["Design Node\n(DSSClient)"]

        subgraph DATASETS["Datasets"]
            DS1["sale_data_final_1\n(ข้อมูลขาย)"]
            DS2["join_data_cl_fill_prepared\n(forecast + actual)"]
        end

        subgraph SCENARIO["Scenario: TEST"]
            MF_IN["📁 Input Folder\n(upload CSV)"]
            PREP["Data\nPreparation"]
            MODEL["Model\n(LightGBM + Prophet)"]
            RESULT["Predicted\nValue"]
            MF_OUT["📁 Output Folder\n(result CSV)"]
        end
    end

    %% === Dashboard Flow (เส้นสีน้ำเงิน) ===
    User -->|"เปิด Dashboard"| Dashboard
    Dashboard -->|"GET /dashboard/summary\nGET /analytics/summary"| API
    API -->|"iter_rows()\nดึง raw data ทั้งก้อน"| DN
    DN --> DS1
    DN --> DS2
    DS1 -->|"raw data\n(หลายหมื่น row)"| API
    DS2 -->|"raw data"| API
    API -->|"Python loop\nfilter + aggregate\n→ JSON (KPI, charts)"| Dashboard
    Dashboard -->|"แสดงกราฟ + ตาราง"| User

    %% === New Prediction Flow (เส้นสีส้ม) ===
    User -->|"กด New Prediction"| NewPred
    NewPred --> Upload
    Upload -->|"① POST /scoring/upload"| API
    API -->|"put_file()"| MF_IN
    MF_IN --> PREP

    NewPred -->|"② POST /scoring/run/TEST"| API
    API -->|"scenario.run()"| DN
    DN -->|"Trigger"| PREP
    PREP --> MODEL
    MODEL --> RESULT
    RESULT --> MF_OUT

    NewPred -->|"③ GET /scoring/jobs\n(poll จนเสร็จ)"| API
    API -->|"get_run_status()"| DN

    NewPred -->|"④ GET /scoring/results/latest"| API
    API -->|"read_file()"| MF_OUT
    MF_OUT -->|"CSV content"| API
    API -->|"parse CSV → JSON\n(forecast data)"| NewPred
    NewPred -->|"แสดง Forecast Chart"| User

    %% Styles
    style FRONTEND fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
    style BACKEND fill:#dcfce7,stroke:#16a34a,color:#14532d
    style DATAIKU fill:#fee2e2,stroke:#dc2626,color:#7f1d1d
    style DATASETS fill:#fef3c7,stroke:#d97706,color:#78350f
    style SCENARIO fill:#f3e8ff,stroke:#9333ea,color:#581c87
```

**ปัญหา:** ช้า, รับ load ไม่ได้, scenario ชนกัน, security risk

---

### Production (แนะนำ)

```mermaid
graph LR
    subgraph CLIENT["Client"]
        User["👤 User\n(Browser)"]
    end

    subgraph FRONTEND["Frontend (Vercel)"]
        FE["Next.js\nReact 19"]
        Charts["Recharts\nDashboard UI"]
    end

    subgraph BACKEND["Backend (Render / Railway)"]
        API["FastAPI\n/api/v1"]
        Cache["Redis\nCache"]
    end

    subgraph SERVING["Prediction Service"]
        AD["API Deployer"]
        AN["API Node\nLightGBM + Prophet\n+ Enrichment"]
    end

    subgraph DATABASE["Data Store"]
        DB["PostgreSQL\nSales / KPI /\nAccuracy Data"]
    end

    subgraph DATAIKU["Dataiku Design Node (Background)"]
        DN["DSS Project\nMALEE_NEW"]
        ML["ML Pipeline\nTrain + Evaluate"]
        DS["Datasets\nPrepare + Clean"]
    end

    %% User flow (เส้นทึบ = realtime)
    User -->|"① เปิดเว็บ"| FE
    FE --> Charts
    FE -->|"② Request"| API
    API -->|"③ ขอ Forecast"| AN
    AN -->|"④ prediction\n+ enriched data"| API
    API -->|"⑤ ขอ Dashboard"| DB
    DB -->|"⑥ sales, KPI"| API
    API --- Cache
    API -->|"⑦ JSON Response"| FE
    FE -->|"⑧ แสดงกราฟ + ตาราง"| User

    %% Background flow (เส้นประ = scheduled)
    DN --- ML
    DN --- DS
    ML -.->|"⑨ scheduled retrain\npackage model"| AD
    AD -.->|"⑩ deploy"| AN
    DS -.->|"⑪ scheduled export\n(daily)"| DB

    style CLIENT fill:#fff,stroke:#333,color:#333
    style FRONTEND fill:#dbeafe,stroke:#2563eb,color:#1e3a8a
    style BACKEND fill:#dcfce7,stroke:#16a34a,color:#14532d
    style SERVING fill:#f3e8ff,stroke:#9333ea,color:#581c87
    style DATABASE fill:#fef3c7,stroke:#d97706,color:#78350f
    style DATAIKU fill:#f1f5f9,stroke:#64748b,color:#334155
```

**อ่านง่ายๆ:**
- **เส้นทึบ (→)** = ทาง user ใช้งานจริง (ทุก request)
- **เส้นประ (-..->)** = background job ทำเอง (scheduled, user ไม่เกี่ยว)

---

## Flow แยกตาม Use Case

### 1. Forecast Prediction

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend
    participant BE as FastAPI
    participant AN as API Node

    User->>FE: ขอ Forecast (เลือก Product, Region, Period)
    FE->>BE: POST /api/v1/predict
    BE->>AN: Send input features
    AN->>AN: Model predict (LightGBM/Prophet)<br/>+ Enrichment (Customer, Product, Size)
    AN-->>BE: Prediction + Enriched Data (ms)
    BE-->>FE: JSON Response
    FE->>User: แสดง Forecast Chart

    Note over AN: Model ถูกโหลดไว้ใน memory<br/>ไม่ต้อง train ใหม่ = เร็วมาก
```

### 2. Dashboard & Analytics

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend
    participant BE as FastAPI
    participant DB as PostgreSQL

    User->>FE: เปิด Dashboard / เลือก Filter
    FE->>BE: GET /api/v1/dashboard/summary
    BE->>DB: SQL Query (indexed, เร็ว)
    DB-->>BE: Aggregated Data
    BE-->>FE: JSON (KPIs + Charts)
    FE->>User: แสดง Dashboard

    Note over DB: Data ถูก export มาจาก Dataiku<br/>เป็น scheduled job (ไม่กระทบ user)
```

### 3. Model Retrain & Data Update (Background — ไม่มี user เกี่ยว)

```mermaid
sequenceDiagram
    autonumber
    participant CRON as Scheduled Job
    participant DN as Design Node
    participant AD as API Deployer
    participant AN as API Node
    participant DB as PostgreSQL

    CRON->>DN: Trigger retrain (weekly)
    DN->>DN: Run full pipeline<br/>(data prep → train → evaluate)
    DN->>DN: Package model v1.3
    DN->>AD: Push package
    AD->>AN: Deploy model v1.3
    Note over AN: Model อัพเดทแบบ zero-downtime

    CRON->>DN: Trigger data export (daily)
    DN->>DN: Prepare dashboard datasets
    DN->>DB: Export aggregated data
    Note over DB: Dashboard data พร้อมใช้
```

---

## สรุปเปรียบเทียบ

| | Demo (ตอนนี้) | Production (แนะนำ) |
|---|---|---|
| **Prediction** | Design Node run scenario ทุกครั้ง | API Node predict จาก model ใน memory |
| **Dashboard** | iter_rows() จาก Design Node | Query จาก PostgreSQL |
| **Retrain** | ทุกครั้งที่ user กด | Scheduled (weekly) |
| **Data update** | ดึงสดทุก request | Scheduled export ลง DB (daily) |
| **ความเร็ว** | นาที | มิลลิวินาที - วินาที |
| **รับ user** | 1-2 คน | หลายร้อยคนพร้อมกัน |
| **Security** | API key สิทธิ์เต็ม ตัวเดียว | แยก key ตาม role |
| **Design Node** | โดน user traffic ตรง | ไม่โดน traffic เลย (แค่ scheduled jobs) |

---

## ลำดับการ Upgrade (แนะนำ)

| Phase | ทำอะไร | ผลลัพธ์ |
|---|---|---|
| **Phase 1** | ย้าย dashboard data ลง PostgreSQL | Dashboard เร็วขึ้น, ลด load Design Node |
| **Phase 2** | Deploy model เป็น API Node + Enrichment | Predict เร็ว (วินาที), ไม่ต้อง run scenario |
| **Phase 3** | ตั้ง scheduled retrain + data export | อัพเดทอัตโนมัติ ไม่ต้อง manual |
| **Phase 4** | ย้าย API key เป็น env vars, แยก key ตาม role | Security |
| **Phase 5** | เพิ่ม Redis cache หน้า DB | รับ traffic สูงขึ้นอีก |
