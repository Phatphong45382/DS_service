# Malee Sales App — Design System & Project Blueprint

> ไฟล์นี้คือ **ศูนย์กลาง** สำหรับทำความเข้าใจ Design ทั้งหมดของโปรเจค
> เพื่อให้สามารถสร้างโปรเจคแบบเดียวกันซ้ำได้อย่าง **consistent**

---

## สารบัญ

1. [Project Overview](#1-project-overview)
2. [Architecture (3-Tier)](#2-architecture-3-tier)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Design Tokens & Visual Language](#5-design-tokens--visual-language)
6. [Component System](#6-component-system)
7. [Layout System](#7-layout-system)
8. [Page Templates](#8-page-templates)
9. [API Design Pattern](#9-api-design-pattern)
10. [State Management](#10-state-management)
11. [Data Flow & Caching](#11-data-flow--caching)
12. [Filter System Pattern](#12-filter-system-pattern)
13. [Chart & Visualization](#13-chart--visualization)
14. [File Upload & Scoring Flow](#14-file-upload--scoring-flow)
15. [Naming Conventions](#15-naming-conventions)
16. [Checklist สำหรับสร้างโปรเจคใหม่](#16-checklist-สำหรับสร้างโปรเจคใหม่)

---

## 1. Project Overview

| Item | Detail |
|------|--------|
| **ชื่อโปรเจค** | Malee Sales App |
| **วัตถุประสงค์** | Demand Forecasting & Sales Analytics Platform |
| **ภาษา UI** | Thai (th) |
| **ประเภท** | Enterprise Dashboard + ML Integration |
| **ฟีเจอร์หลัก** | Sales Dashboard, Forecast Accuracy (WAPE/Bias), Scenario Planner, Dataiku AI Integration |

---

## 2. Architecture (3-Tier)

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│              Next.js 16 + React 19 + Tailwind 4             │
│              shadcn/ui + Recharts + Framer Motion           │
│                     Port: 3000                              │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API (JSON)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                              │
│              FastAPI + Python + Pandas                       │
│              Port: 8080  Prefix: /api/v1                    │
│              In-memory cache (5 min TTL)                    │
└──────────────────────┬──────────────────────────────────────┘
                       │ Dataiku API Client
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER                              │
│              Dataiku DSS (ML Pipeline)                      │
│              Datasets: sale_data_final_1,                   │
│              join_data_cl_fill_prepared                      │
│              Models: LightGBM + Prophet                     │
└─────────────────────────────────────────────────────────────┘
```

**หลักการ:** แต่ละ Tier แยกกัน deploy ได้อิสระ, สื่อสารผ่าน REST API เท่านั้น

---

## 3. Tech Stack

### Frontend
| Library | Version | หน้าที่ |
|---------|---------|---------|
| Next.js | 16 | SSR Framework, File-based routing |
| React | 19 | UI Library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Utility-first styling |
| shadcn/ui | 3.8 | Base UI Components (New York style) |
| Radix UI | 1.4 | Headless accessible components |
| Recharts | 3.7 | Charting library |
| Framer Motion | 12 | Animation |
| Lucide React | 0.563 | Icons |
| class-variance-authority | 0.7 | Component variants |
| date-fns | 4.1 | Date utilities |
| papaparse | 5.5 | CSV parsing |
| xlsx | 0.18 | Excel handling |
| react-dropzone | 15.0 | File upload UI |
| cmdk | 1.1 | Command palette |

### Backend
| Library | หน้าที่ |
|---------|---------|
| FastAPI | Web framework |
| Uvicorn | ASGI server |
| Pydantic | Data validation & serialization |
| python-multipart | File upload handling |
| dataiku-api-client | Dataiku DSS integration |
| pandas | Data manipulation |
| aiofiles | Async file I/O |

---

## 4. Project Structure

```
project-root/
│
├── backend/                      # Python FastAPI Backend
│   ├── main.py                   # App factory + CORS middleware
│   ├── config.py                 # Environment vars (Dataiku host, keys)
│   ├── routers/                  # Endpoint modules
│   │   ├── health.py             # GET /health
│   │   ├── dashboard.py          # GET /dashboard/summary, /dashboard/filters
│   │   ├── analytics.py          # GET /analytics/summary, /analytics/filters, /analytics/deep-dive
│   │   └── scoring.py            # POST /scoring/upload, /scoring/run, GET /scoring/results
│   ├── schemas/                  # Pydantic models
│   │   ├── common.py             # APIResponse[T] wrapper
│   │   └── dashboard_v2.py       # KPI, MonthlyTSPoint, DeepDiveResponse, etc.
│   └── services/
│       └── dataiku_service.py    # Singleton Dataiku API client
│
├── malee-sales-app/              # Next.js Frontend
│   ├── app/                      # App Router pages
│   │   ├── layout.tsx            # Root layout + font + providers
│   │   ├── page.tsx              # Home landing page
│   │   ├── globals.css           # Global styles + CSS variables
│   │   ├── forecast/             # Forecast dashboard
│   │   ├── analytics-dashboard/  # Sales analytics
│   │   ├── accuracy-deep-dive/   # Model accuracy analysis
│   │   ├── scenario-planner/     # What-if planning
│   │   ├── new-prediction/       # ML prediction UI
│   │   ├── runs/                 # Forecast run history
│   │   ├── monitoring/           # Health monitoring
│   │   └── settings/             # User settings
│   │
│   ├── components/               # Reusable components
│   │   ├── ui/                   # shadcn/ui base (button, card, select, etc.)
│   │   ├── layout/               # MainLayout, Sidebar, TopBar
│   │   ├── dashboard/            # KPI cards, charts, filters
│   │   ├── analytics/            # Analytics-specific charts
│   │   ├── accuracy-deep-dive/   # Heatmaps, scatter, distribution
│   │   ├── upload/               # Upload panel, data preview
│   │   ├── charts/               # Scenario charts
│   │   ├── monitoring/           # Health & alerts
│   │   └── home/                 # Landing page cards
│   │
│   ├── lib/                      # Utilities & contexts
│   │   ├── api-client.ts         # Backend API integration
│   │   ├── utils.ts              # cn() helper
│   │   ├── planning-context.tsx  # Dashboard state management
│   │   ├── search-context.tsx    # Global search state
│   │   ├── sidebar-context.tsx   # Sidebar collapse state
│   │   ├── mock-data.ts          # Dev mock data
│   │   └── types/
│   │       └── dataiku.ts        # API type definitions
│   │
│   └── types/                    # Global TypeScript types
│       ├── index.ts              # SalesData, Product, KPI types
│       └── planning.ts           # Planning system types
│
├── data/                         # Raw data files
│   └── Sale_2021_2024_prepared.csv
│
├── requirements.txt              # Python dependencies
├── DESIGN_SYSTEM.md              # ← ไฟล์นี้
├── README.md                     # Quick start guide
├── WIKI.md                       # Technical documentation
├── ARCHITECTURE_FLOW.md          # System flow diagrams
└── DEPLOYMENT.md                 # Deploy instructions
```

**หลักการจัดโฟลเดอร์:**
- `routers/` → แยกตาม domain (dashboard, analytics, scoring)
- `components/` → แยกตาม feature area ไม่ใช่ตาม component type
- `schemas/` → Pydantic models สำหรับ request/response validation
- `lib/` → Shared utilities, contexts, API client

---

## 5. Design Tokens & Visual Language

### 5.1 Color Palette

```css
/* === Primary Enterprise Theme === */
--navy:           #0f172a    /* Primary dark / sidebar / headers */
--slate-50:       #f8fafc    /* Page background */
--slate-100:      #f1f5f9    /* Card background alt */
--slate-200:      #e2e8f0    /* Borders */
--slate-400:      #94a3b8    /* Muted text */
--slate-500:      #64748b    /* Secondary text */
--slate-600:      #475569    /* Body text */
--slate-900:      #0f172a    /* Primary text */

/* === Accent Colors === */
--blue-500:       #3b82f6    /* Links, secondary actions */
--blue-600:       #2563eb    /* Primary buttons */
--emerald-500:    #10b981    /* Positive / growth / success */
--amber-500:      #f59e0b    /* Warning / neutral indicators */
--red-500:        #ef4444    /* Error / negative / decline */
--indigo-500:     #6366f1    /* Projections / AI features */

/* === Warm Palette (Optional / Landing Page) === */
--warm-bg:        #FCFBF9
--warm-accent:    #FF8A5B
--warm-text:      #44403C
```

### 5.2 Typography

```css
/* Fonts — ทุก font ต้องรองรับ Thai */
--font-body:      'Inter', sans-serif              /* Body text */
--font-display:   'Outfit', 'Plus Jakarta Sans'    /* Headings, brand */
--font-mono:      'JetBrains Mono', monospace      /* Code, tabular data */

/* Scale */
text-xs:    0.75rem   /* 12px — captions, badges */
text-sm:    0.875rem  /* 14px — secondary text, table cells */
text-base:  1rem      /* 16px — body text */
text-lg:    1.125rem  /* 18px — sub-headings */
text-xl:    1.25rem   /* 20px — section titles */
text-2xl:   1.5rem    /* 24px — page titles */
text-3xl:   1.875rem  /* 30px — hero numbers, KPI values */
```

### 5.3 Spacing & Radius

```css
/* Border Radius */
--radius:         12px (0.75rem)    /* Base / buttons */
--radius-sm:      8px               /* Small elements */
--radius-md:      10px              /* Medium elements */
--radius-lg:      12px              /* Cards */
--radius-xl:      16px              /* Large cards */
--radius-card:    24px              /* Hero cards, landing page */

/* Spacing Pattern (Tailwind default 4px base) */
gap-2:   8px    /* Inline elements */
gap-3:   12px   /* Between small items */
gap-4:   16px   /* Standard gap */
gap-6:   24px   /* Section internal */
gap-8:   32px   /* Between sections */
p-4:     16px   /* Card padding (small) */
p-6:     24px   /* Card padding (standard) */
p-8:     32px   /* Section padding */
```

### 5.4 Shadows

```css
/* Enterprise (ใช้กับ cards, dropdowns) */
shadow-enterprise-sm:  0 1px 2px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.06)
shadow-enterprise-md:  0 4px 6px rgba(15,23,42,0.04), 0 2px 4px rgba(15,23,42,0.06)
shadow-enterprise-lg:  0 10px 15px rgba(15,23,42,0.04), 0 4px 6px rgba(15,23,42,0.06)
```

### 5.5 Visual Rules

| Rule | Detail |
|------|--------|
| Background | `slate-50` (#f8fafc) สำหรับ page, `white` สำหรับ cards |
| Border | `slate-200` (#e2e8f0) เส้น 1px |
| Text hierarchy | `slate-900` heading → `slate-600` body → `slate-400` muted |
| Positive/Negative | `emerald-500` ขึ้น, `red-500` ลง, `amber-500` neutral |
| Interactive hover | ลดความเข้มสีลง 1 step (e.g., blue-600 → blue-700) |
| Focus ring | `ring-2 ring-blue-500 ring-offset-2` |
| Glassmorphism | `backdrop-blur-xl bg-white/80 border border-white/20` (optional) |

---

## 6. Component System

### 6.1 Base Components (shadcn/ui — New York style)

ทุกโปรเจคเริ่มจาก shadcn/ui base components:

```
button, card, badge, select, tabs, input, label,
dropdown-menu, dialog, sheet, popover, tooltip,
table, switch, slider, separator, avatar, calendar,
command (cmdk), multi-select
```

**Config:** `components.json`
```json
{
  "style": "new-york",
  "rsc": true,
  "tailwind": { "baseColor": "slate", "cssVariables": true },
  "iconLibrary": "lucide"
}
```

### 6.2 Custom Components (แบ่งตาม Layer)

```
Layer 1: UI Primitives (shadcn/ui)
    ↓
Layer 2: Layout Components
    ├── MainLayout      — sidebar + topbar + content area
    ├── Sidebar         — collapsible navigation (64px ↔ 256px)
    └── TopBar          — breadcrumbs + page actions

    ↓
Layer 3: Domain Components
    ├── KPICard         — metric display + trend + animation
    ├── ChartCard       — wrapper รอบ Recharts
    ├── FilterBar       — filter chips + filter drawer
    ├── FilterDrawer    — full filter panel (sheet)
    ├── PageHeader      — page title + description + actions
    └── StatusBadge     — status indicators

    ↓
Layer 4: Page-Specific Components
    ├── dashboard/*     — sales-overview, revenue-chart, customer-table
    ├── analytics/*     — actual-vs-plan, heatmaps, pareto
    ├── accuracy/*      — error-distribution, bias-scatter, ranking
    ├── upload/*        — upload-panel, data-preview, forecast-config
    └── monitoring/*    — health-overview, alerts-feed
```

### 6.3 KPI Card Pattern (ใช้บ่อยที่สุด)

```tsx
// Pattern ที่ใช้ซ้ำทุกหน้า
<KPICard
  title="Total Revenue"          // ชื่อ metric
  value={1234567}                 // ค่าตัวเลข
  format="currency" | "number" | "percent"
  trend={{ value: 12.5, direction: "up" }}  // MoM change
  icon={<TrendingUp />}          // Lucide icon
  color="emerald" | "blue" | "amber" | "red"
/>
```

**Animation:** ใช้ Framer Motion `useSpring` นับตัวเลขจาก 0 → value

### 6.4 Chart Card Pattern

```tsx
<ChartCard title="Monthly Sales Trend" subtitle="Last 12 months">
  <ResponsiveContainer width="100%" height={300}>
    <AreaChart data={monthlyData}>
      <defs>
        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
        </linearGradient>
      </defs>
      <Area dataKey="value" fill="url(#colorSales)" stroke="#3b82f6" />
    </AreaChart>
  </ResponsiveContainer>
</ChartCard>
```

---

## 7. Layout System

### 7.1 Master Layout

```
┌──────────────────────────────────────────────────┐
│ TopBar (h-16, sticky top-0, bg-white, border-b)  │
├──────┬───────────────────────────────────────────┤
│      │                                           │
│  S   │        Main Content Area                  │
│  i   │        (p-6, bg-slate-50)                 │
│  d   │                                           │
│  e   │   ┌──────────────────────────────┐        │
│  b   │   │  PageHeader                  │        │
│  a   │   ├──────────────────────────────┤        │
│  r   │   │  KPI Row (grid-cols-4)       │        │
│      │   ├──────────────────────────────┤        │
│ 64px │   │  Charts (grid-cols-2 or 3)   │        │
│  or  │   ├──────────────────────────────┤        │
│256px │   │  Tables / Detail             │        │
│      │   └──────────────────────────────┘        │
│      │                                           │
└──────┴───────────────────────────────────────────┘
```

### 7.2 Grid System

```css
/* KPI Row */
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4

/* Chart Section */
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6

/* Main + Sidebar Layout */
grid grid-cols-1 lg:grid-cols-12 gap-6
  main:    lg:col-span-8
  sidebar: lg:col-span-4
```

### 7.3 Responsive Breakpoints

| Breakpoint | Width | Usage |
|-----------|-------|-------|
| default | < 768px | Mobile: 1 column, sidebar hidden |
| `md:` | ≥ 768px | Tablet: 2 columns |
| `lg:` | ≥ 1024px | Desktop: full layout with sidebar |
| `xl:` | ≥ 1280px | Wide: extra spacing |

---

## 8. Page Templates

### Template A: Dashboard Page (ใช้กับ forecast, analytics-dashboard)

```
PageHeader → Filter Bar → KPI Row (4 cards) → Charts (2-3 cols) → Data Table
```

### Template B: Deep-Dive / Analysis Page (ใช้กับ accuracy-deep-dive, analytics)

```
PageHeader → Filter Bar → KPI Row → Tab Navigation → [Heatmap | Scatter | Distribution | Ranking]
```

### Template C: Action Page (ใช้กับ new-prediction, scenario-planner)

```
PageHeader → Upload Panel / Config Form → Preview → Run Button → Results Chart + Table
```

### Template D: Landing Page (ใช้กับ home)

```
Hero Section → Feature Cards (grid) → Steps/Journey → CTA
```

### Template E: List / History Page (ใช้กับ runs)

```
PageHeader → Filter/Search → Table with status badges → Detail / Compare views
```

---

## 9. API Design Pattern

### 9.1 URL Convention

```
Base: /api/v1

GET  /api/v1/{domain}/filters        → ดึง filter options
GET  /api/v1/{domain}/summary        → ดึง aggregated data + KPIs
GET  /api/v1/{domain}/deep-dive      → ดึง detailed analysis
POST /api/v1/{domain}/upload         → อัพโหลดไฟล์
POST /api/v1/{domain}/run/{id}       → trigger action
GET  /api/v1/{domain}/jobs/{id}/{run} → poll status
GET  /api/v1/health                  → health check
```

### 9.2 Response Envelope (ใช้ทุก endpoint)

```typescript
// Frontend Type
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta: {
    request_id?: string;
    timestamp: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

```python
# Backend Pydantic Model
class APIResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    meta: Optional[Meta] = None
    error: Optional[ErrorDetail] = None
```

### 9.3 Query Parameter Pattern

```
?year_from=2023&month_from=1&year_to=2024&month_to=12    # Date range
&customer=7-Eleven&customer=Lotus's                        # Multi-select (repeat key)
&product_group=Fruit+Juice                                 # Single filter
&has_promotion=1                                           # Boolean (0 or 1)
&breakdown=product_group                                   # Aggregation dimension
```

### 9.4 Router Organization (Backend)

```python
# แต่ละ router = 1 domain = 1 file
router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# endpoints ใน router
@router.get("/filters")
@router.get("/summary")
```

---

## 10. State Management

### Pattern: React Context API (ไม่ใช้ Redux)

```
AppProviders (components/providers.tsx)
├── SearchProvider      → searchQuery: string
├── PlanningProvider    → filters, scenario params, dashboard data, loading
└── SidebarProvider     → isCollapsed: boolean (localStorage persisted)
```

### หลักการ:
1. **Context ต่อ feature** — ไม่รวม global store เดียว
2. **Applied vs Pending filters** — user แก้ใน drawer → กด Apply → trigger API
3. **Cascading filters** — เปลี่ยน product_group → refetch flavor, size options
4. **useEffect for data fetching** — fetch เมื่อ applied filters เปลี่ยน
5. **useMemo for derived data** — aggregate chart data จาก raw response

---

## 11. Data Flow & Caching

### Frontend → Backend Flow

```
User Action (filter change / page load)
    ↓
Context useEffect (detect filter change)
    ↓
api-client.ts → fetch(`/api/v1/...?params`)
    ↓
Backend Router → Check DATA_CACHE (5 min TTL)
    ├── Cache HIT  → return cached data
    └── Cache MISS → DataikuService.get_dataset_rows()
                         ↓
                     Dataiku DSS → return raw rows
                         ↓
                     Filter → Aggregate → Calculate KPIs
                         ↓
                     Store in cache + return APIResponse[T]
    ↓
Frontend receives data → setState → re-render charts
```

### Backend Caching Strategy

```python
DATA_CACHE = {}  # { dataset_name: { "data": [...], "timestamp": datetime } }
CACHE_TTL = 300  # 5 minutes

def get_cached_data(dataset_name):
    if dataset_name in DATA_CACHE:
        if (now - DATA_CACHE[dataset_name]["timestamp"]).seconds < CACHE_TTL:
            return DATA_CACHE[dataset_name]["data"]
    # fetch fresh, store, return
```

---

## 12. Filter System Pattern

### Design

```
┌─ Filter Bar (แสดง applied filters เป็น chips) ─────────────┐
│  [Product Group ▼]  [Flavor ▼]  [Size ▼]  [🔽 More Filters] │
└─────────────────────────────────────────────────────────────┘
                                        │
                                        ▼ (opens Sheet/Drawer)
┌─ Filter Drawer ─────────────────────────────────────────────┐
│  Date Range:     [2023/01] → [2024/12]                       │
│  Customer:       [Multi-select dropdown]                     │
│  Product Group:  [Multi-select dropdown]  ← cascading        │
│  Flavor:         [Multi-select dropdown]  ← depends on above │
│  Size:           [Multi-select dropdown]  ← depends on above │
│  Has Promotion:  [Toggle switch]                             │
│                                                              │
│  [Reset Filters]                    [Apply Filters]          │
└──────────────────────────────────────────────────────────────┘
```

### Cascading Logic

```
1. User selects Product Group = "Fruit Juice"
2. Frontend calls GET /api/v1/dashboard/filters?product_group=Fruit+Juice
3. Backend returns filtered flavor & size options
4. Frontend updates Flavor dropdown choices
5. User selects Flavor, clicks Apply
6. Applied filters → trigger summary API call
```

---

## 13. Chart & Visualization

### Library: Recharts 3.7

### Chart Types ที่ใช้:

| Chart Type | Use Case | Component |
|-----------|----------|-----------|
| AreaChart | Monthly sales trend, forecast bands | `sales-trend-chart.tsx` |
| BarChart | Category comparison, top products | `category-chart.tsx` |
| LineChart | Actual vs Plan overlay | `actual-vs-plan-chart.tsx` |
| ScatterChart | Bias analysis (planned vs actual) | `bias-scatter-plot.tsx` |
| PieChart | Category distribution | `browser-stats.tsx` |
| ComposedChart | Mixed bar + line (volume + %) | `monthly-error-chart.tsx` |
| Heatmap (custom) | Customer × Month WAPE/Bias | `error-heatmap.tsx` |

### Chart Styling Convention

```tsx
// สีมาตรฐาน
const CHART_COLORS = {
  primary:    '#3b82f6',  // blue-500
  secondary:  '#6366f1',  // indigo-500
  positive:   '#10b981',  // emerald-500
  negative:   '#ef4444',  // red-500
  warning:    '#f59e0b',  // amber-500
  neutral:    '#94a3b8',  // slate-400
};

// Gradient fill pattern (AreaChart)
<defs>
  <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
    <stop offset="95%" stopColor={color} stopOpacity={0} />
  </linearGradient>
</defs>

// ทุก chart ต้องอยู่ใน ResponsiveContainer
<ResponsiveContainer width="100%" height={300}>
  ...
</ResponsiveContainer>
```

### KPI Metrics ที่คำนวณ:

| Metric | คำอธิบาย | สูตร |
|--------|----------|------|
| WAPE | Weighted Absolute % Error | Σ\|actual-plan\| / Σ\|actual\| × 100 |
| Bias | Forecast bias | Σ(actual-plan) / Σ(actual) × 100 |
| MoM Growth | Month-over-Month | (this_month - last_month) / last_month × 100 |
| Promo Coverage | สัดส่วนมี promo | count(has_promo) / total × 100 |
| Target Achievement | บรรลุเป้า | actual / planned × 100 |
| Under/Over Plan Rate | อัตราต่ำ/สูงกว่าแผน | count(under_or_over) / total × 100 |

---

## 14. File Upload & Scoring Flow

```
1. User drops CSV file (react-dropzone)
       ↓
2. Frontend parses preview (papaparse)
       ↓
3. POST /api/v1/scoring/upload → Backend uploads to Dataiku folder
       ↓
4. User clicks "Run Forecast"
       ↓
5. POST /api/v1/scoring/run/{scenario_id} → Trigger Dataiku scenario
       ↓
6. Frontend polls GET /api/v1/scoring/jobs/{scenario_id}/{run_id}
       ↓ (every 3-5 seconds until DONE)
7. GET /api/v1/scoring/results/latest → Fetch forecast output
       ↓
8. Display results in chart + table
```

---

## 15. Naming Conventions

### Files & Folders
| Type | Convention | Example |
|------|-----------|---------|
| React component | `kebab-case.tsx` | `kpi-card.tsx` |
| Page (Next.js) | `page.tsx` inside folder | `forecast/page.tsx` |
| Python module | `snake_case.py` | `dataiku_service.py` |
| Type file | `kebab-case.ts` | `types/planning.ts` |
| Context | `kebab-case-context.tsx` | `planning-context.tsx` |

### Code
| Type | Convention | Example |
|------|-----------|---------|
| React component | PascalCase | `KPICard`, `FilterDrawer` |
| Function | camelCase | `fetchDashboardSummary()` |
| Python function | snake_case | `get_dashboard_summary()` |
| API route | kebab-case | `/analytics/deep-dive` |
| CSS variable | kebab-case | `--font-display` |
| TypeScript interface | PascalCase | `DashboardSummary` |
| Pydantic model | PascalCase | `APIResponse` |
| Constants | UPPER_SNAKE | `CACHE_TTL`, `DATA_CACHE` |

### Component File Structure
```tsx
// 1. Imports
import { ... } from "react"
import { ... } from "@/components/ui/..."
import { ... } from "@/lib/..."

// 2. Types (ถ้า local)
interface Props { ... }

// 3. Component
export function MyComponent({ ... }: Props) {
  // hooks
  // derived state (useMemo)
  // handlers
  // return JSX
}
```

---

## 16. Checklist สำหรับสร้างโปรเจคใหม่

### Phase 1: Setup

- [ ] Init Next.js project (`npx create-next-app@latest --typescript --tailwind --app`)
- [ ] Install shadcn/ui (`npx shadcn@latest init` → style: new-york, base: slate)
- [ ] Install core dependencies: `recharts framer-motion lucide-react date-fns papaparse cmdk`
- [ ] Setup fonts: Inter (body), Outfit (display), JetBrains Mono (mono)
- [ ] Copy `globals.css` design tokens (colors, shadows, radius, typography)
- [ ] Init FastAPI backend project (`pip install fastapi uvicorn pydantic python-multipart`)
- [ ] Setup `config.py` with environment variables
- [ ] Setup `APIResponse[T]` generic envelope in `schemas/common.py`

### Phase 2: Layout

- [ ] Build `MainLayout` (sidebar + topbar + content area)
- [ ] Build `Sidebar` (collapsible, navigation links, Lucide icons)
- [ ] Build `TopBar` (breadcrumbs, search, actions)
- [ ] Define routing structure in `app/` directories
- [ ] Setup Context Providers (planning, search, sidebar)

### Phase 3: Core Components

- [ ] Build `KPICard` with animated number (Framer Motion useSpring)
- [ ] Build `ChartCard` wrapper for Recharts
- [ ] Build `FilterBar` + `FilterDrawer` (Sheet-based)
- [ ] Build `PageHeader` component
- [ ] Build `StatusBadge` component

### Phase 4: API Integration

- [ ] Create `api-client.ts` with fetchAPI helper + error handling
- [ ] Setup backend routers by domain (dashboard, analytics, scoring)
- [ ] Implement data service (Dataiku or database)
- [ ] Add in-memory caching (5 min TTL)
- [ ] Define Pydantic schemas for all responses

### Phase 5: Pages

- [ ] Build Dashboard page (Template A)
- [ ] Build Analytics page (Template B)
- [ ] Build Prediction/Upload page (Template C)
- [ ] Build Landing page (Template D)
- [ ] Build History/List page (Template E)

### Phase 6: Polish

- [ ] Add loading states (shimmer/skeleton)
- [ ] Add error states (graceful fallback)
- [ ] Responsive testing (mobile → desktop)
- [ ] Thai language text + number formatting (th-TH locale)
- [ ] Deploy backend (Render/Railway) + frontend (Vercel)

---

## Quick Reference: Key Files ที่ต้องดูก่อนเริ่มโปรเจคใหม่

| ต้องการดูอะไร | ไปดูไฟล์ |
|--------------|----------|
| Design tokens, CSS variables | `malee-sales-app/app/globals.css` |
| shadcn/ui config | `malee-sales-app/components.json` |
| Layout structure | `malee-sales-app/components/layout/main-layout.tsx` |
| Sidebar navigation | `malee-sales-app/components/layout/sidebar.tsx` |
| KPI card pattern | `malee-sales-app/components/dashboard/kpi-card.tsx` |
| Filter pattern | `malee-sales-app/components/dashboard/filter-bar.tsx` |
| API client | `malee-sales-app/lib/api-client.ts` |
| State management | `malee-sales-app/lib/planning-context.tsx` |
| API response wrapper | `backend/schemas/common.py` |
| Router pattern | `backend/routers/dashboard.py` |
| Data service | `backend/services/dataiku_service.py` |
| Type definitions | `malee-sales-app/types/planning.ts` |
