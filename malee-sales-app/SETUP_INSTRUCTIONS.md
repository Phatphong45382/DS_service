# คำสั่งที่ต้องรันก่อนทดสอบระบบ

## 1. ติดตั้ง Dependencies
```bash
cd c:\work\pre_sale\DS_service\Malee\malee-sales-app
npm install recharts
```

## 2. รัน Development Server
```bash
npm run dev
```

## 3. เปิดเบราว์เซอร์
เปิด: http://localhost:3000/overview

## ไฟล์ที่สร้างใหม่

### Global Infrastructure
1. `types/planning.ts` - TypeScript types ทั้งหมด
2. `lib/planning-data.ts` - Mock data และ calculation functions
3. `lib/planning-context.tsx` - React Context สำหรับ global state
4. `components/planning/global-filters.tsx` - Global filters component
5. `components/planning/global-summary-cards.tsx` - Global summary cards

### Page 1: Overview
6. `app/overview/page.tsx` - Overview page หลัก
7. `components/planning/overview-kpi-cards.tsx` - KPI cards (4 ใบ)
8. `components/planning/trend-chart.tsx` - กราฟแนวโน้ม (Recharts)
9. `components/planning/insights-section.tsx` - Insights ภาษาไทย
10. `components/planning/top-items-table.tsx` - ตาราง Top 5 SKU

### Modified Files
- `components/layout/main-layout.tsx` - เพิ่ม PlanningProvider
- `components/layout/header.tsx` - เพิ่ม GlobalFilters
- `components/layout/sidebar.tsx` - อัปเดต navigation

## สิ่งที่ทำได้แล้ว ✅
- ✅ Global infrastructure (types, data, context)
- ✅ Global filters (flavor, size, channel, date range)
- ✅ Global summary cards (4 cards)
- ✅ Overview page พร้อมทุก component
- ✅ KPI cards (Actual, Forecast, Recommended Production, Promo)
- ✅ Trend chart (12 เดือนย้อนหลัง + 6 เดือนข้างหน้า)
- ✅ Insights section (rule-based analysis)
- ✅ Top 5 SKU table
- ✅ Navigation อัปเดต

## Next Steps
หลังจากทดสอบหน้า Overview แล้ว สามารถทำต่อได้:
1. Page 2: Scenario Planner
2. Page 3: Monitoring & Alerts
3. Page 4: New Prediction (Upload & Re-Forecast)
4. Page 5: Settings (Optional)
