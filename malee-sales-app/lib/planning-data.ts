// Mock data and utility functions for Planning System

import {
    SalesMonthly,
    PromoMonthly,
    ForecastData,
    ProductionPlan,
    Alert,
    GlobalSummary,
} from '@/types/planning';

// Helper to generate year_month strings
export function generateYearMonth(offset: number = 0): string {
    const date = new Date();
    date.setMonth(date.getMonth() + offset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

// Mock flavors and sizes
export const FLAVORS = ['Orange', 'Apple', 'Grape', 'Coconut', 'Pineapple', 'Mango'];
export const SIZES = [200, 400, 1000]; // ml
export const CHANNELS = ['Retail', 'Wholesale', 'Online', 'Export'];

// Seeded random number generator for consistent data
function seededRandom(seed: number) {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// Generate mock sales data (last 24 months)
export function generateSalesMonthly(): SalesMonthly[] {
    const data: SalesMonthly[] = [];
    let localSeed = 12345;
    const localRandom = () => {
        const x = Math.sin(localSeed++) * 10000;
        return x - Math.floor(x);
    };

    for (let monthOffset = -24; monthOffset < 0; monthOffset++) {
        FLAVORS.forEach(flavor => {
            SIZES.forEach(size => {
                const baseQty = 5000 + localRandom() * 10000;
                const seasonality = 1 + 0.3 * Math.sin((monthOffset / 12) * Math.PI * 2);
                const noise = 0.8 + localRandom() * 0.4;

                data.push({
                    year_month: generateYearMonth(monthOffset),
                    flavor,
                    size,
                    sales_qty: Math.round(baseQty * seasonality * noise),
                    channel: CHANNELS[Math.floor(localRandom() * CHANNELS.length)],
                });
            });
        });
    }

    return data;
}

export const salesMonthly = generateSalesMonthly();

// Generate mock promo data
export function generatePromoMonthly(): PromoMonthly[] {
    const data: PromoMonthly[] = [];
    let localSeed = 54321; // Different seed for promo
    const localRandom = () => {
        const x = Math.sin(localSeed++) * 10000;
        return x - Math.floor(x);
    };

    // Add promos for some months (about 30% of months have promos)
    for (let monthOffset = -24; monthOffset < 6; monthOffset++) {
        if (localRandom() < 0.3) {
            const flavor = FLAVORS[Math.floor(localRandom() * FLAVORS.length)];
            const size = SIZES[Math.floor(localRandom() * SIZES.length)];

            data.push({
                year_month: generateYearMonth(monthOffset),
                flavor,
                size,
                promo_flag: true,
                promo_days: Math.floor(localRandom() * 20) + 5,
                discount_pct: Math.floor(localRandom() * 30) + 10,
                promo_type: ['price_cut', 'bundle', 'bogo'][Math.floor(localRandom() * 3)] as any,
            });
        }
    }

    return data;
}

export const promoMonthly = generatePromoMonthly();

// Calculate baseline forecast (simple rolling mean)
export function calculateBaselineForecast(
    sales: SalesMonthly[],
    horizon: number = 6
): ForecastData[] {
    const forecasts: ForecastData[] = [];

    FLAVORS.forEach(flavor => {
        SIZES.forEach(size => {
            // Get last 3 months average
            const recentSales = sales
                .filter(s => s.flavor === flavor && s.size === size)
                .slice(-3);

            const avgQty = recentSales.reduce((sum, s) => sum + s.sales_qty, 0) / recentSales.length;

            // Generate forecasts for next N months
            for (let i = 1; i <= horizon; i++) {
                const seasonality = 1 + 0.2 * Math.sin((i / 12) * Math.PI * 2);
                forecasts.push({
                    year_month: generateYearMonth(i),
                    flavor,
                    size,
                    forecast_qty: Math.round(avgQty * seasonality),
                    baseline_forecast: Math.round(avgQty * seasonality),
                });
            }
        });
    });

    return forecasts;
}

export const forecastBaseline = calculateBaselineForecast(salesMonthly);

// Calculate scenario forecast with uplift
export function calculateScenarioForecast(
    baseline: ForecastData[],
    upliftPct: number
): ForecastData[] {
    return baseline.map(f => ({
        ...f,
        scenario_forecast: Math.round(f.forecast_qty * (1 + upliftPct / 100)),
    }));
}

// Calculate production plan
export function calculateProductionPlan(
    forecasts: ForecastData[],
    safetyStockPct: number = 15,
    capacityMax?: number,
    moq?: number
): ProductionPlan[] {
    return forecasts.map(f => {
        const forecastQty = f.scenario_forecast || f.forecast_qty;
        let recommended = Math.round(forecastQty * (1 + safetyStockPct / 100));

        // Apply MOQ if specified
        if (moq && moq > 0) {
            recommended = Math.ceil(recommended / moq) * moq;
        }

        const capacityViolation = capacityMax ? recommended > capacityMax : false;

        return {
            year_month: f.year_month,
            flavor: f.flavor,
            size: f.size,
            baseline_forecast: f.baseline_forecast || f.forecast_qty,
            scenario_forecast: f.scenario_forecast,
            buffer_pct: safetyStockPct,
            recommended_qty: capacityViolation && capacityMax ? capacityMax : recommended,
            max_qty: capacityMax,
            capacity_violation_flag: capacityViolation,
            note: capacityViolation ? 'Capacity exceeded' : undefined,
        };
    });
}

export const productionPlan = calculateProductionPlan(forecastBaseline);

// Generate alerts
export function generateAlerts(
    sales: SalesMonthly[],
    forecasts: ForecastData[],
    promos: PromoMonthly[]
): Alert[] {
    const alerts: Alert[] = [];

    // Demand spike alert
    const latestMonth = generateYearMonth(-1);
    const latestSales = sales.filter(s => s.year_month === latestMonth);

    latestSales.forEach(sale => {
        const forecast = forecasts.find(
            f => f.flavor === sale.flavor && f.size === sale.size
        );

        if (forecast && sale.sales_qty > forecast.forecast_qty * 1.3) {
            alerts.push({
                id: `spike_${sale.flavor}_${sale.size}`,
                date: latestMonth,
                flavor: sale.flavor,
                size: sale.size,
                alert_type: 'demand_spike',
                severity: 'high',
                message: `ยอดขาย ${sale.flavor} ${sale.size}ml สูงกว่าคาดการณ์ ${Math.round(((sale.sales_qty / forecast.forecast_qty) - 1) * 100)}%`,
                recommended_action: [
                    'ตรวจสอบสาเหตุการเพิ่มขึ้น',
                    'ปรับแผนการผลิตเดือนหน้า',
                    'เพิ่ม safety stock'
                ],
            });
        }
    });

    // Promo conflict alert
    promos.forEach(promo => {
        if (promo.promo_days > 20 && promo.discount_pct > 20) {
            alerts.push({
                id: `promo_${promo.flavor}_${promo.size}_${promo.year_month}`,
                date: promo.year_month,
                flavor: promo.flavor,
                size: promo.size,
                alert_type: 'promo_conflict',
                severity: 'medium',
                message: `โปรโมชัน ${promo.flavor} ${promo.size}ml ยาวนาน (${promo.promo_days} วัน) และลดสูง (${promo.discount_pct}%)`,
                recommended_action: [
                    'ตรวจสอบผลกระทบต่อ margin',
                    'เตรียม stock เพิ่ม',
                ],
            });
        }
    });

    return alerts;
}

export const alerts = generateAlerts(salesMonthly, forecastBaseline, promoMonthly);

// Calculate global summary
export function calculateGlobalSummary(
    sales: SalesMonthly[],
    forecasts: ForecastData[],
    productionPlans: ProductionPlan[]
): GlobalSummary {
    const lastMonth = generateYearMonth(-1);
    const nextMonth = generateYearMonth(1);

    const lastMonthActual = sales
        .filter(s => s.year_month === lastMonth)
        .reduce((sum, s) => sum + s.sales_qty, 0);

    const nextMonthForecast = forecasts
        .filter(f => f.year_month === nextMonth)
        .reduce((sum, f) => sum + f.forecast_qty, 0);

    const recommendedProduction = productionPlans
        .filter(p => p.year_month === nextMonth)
        .reduce((sum, p) => sum + p.recommended_qty, 0);

    // Deterministic risk calculation based on data
    const last12Months = sales.slice(-12);
    const avg = last12Months.reduce((sum, s) => sum + s.sales_qty, 0) / (last12Months.length || 1);
    const volatility = avg > 0 ? (lastMonthActual / avg) % 0.3 : 0.15;

    const riskBadge: 'Low' | 'Med' | 'High' =
        volatility > 0.2 ? 'High' : volatility > 0.1 ? 'Med' : 'Low';

    return {
        last_month_actual: lastMonthActual,
        next_month_forecast: nextMonthForecast,
        recommended_production: recommendedProduction,
        risk_badge: riskBadge,
    };
}

export const globalSummary = calculateGlobalSummary(
    salesMonthly,
    forecastBaseline,
    productionPlan
);

// Format functions
export function formatMonth(yearMonth: string): string {
    const [year, month] = yearMonth.split('-');
    const monthNames = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    return `${monthNames[parseInt(month) - 1]} ${parseInt(year) + 543}`;
}

export function formatQuantity(qty: number): string {
    return new Intl.NumberFormat('th-TH').format(qty);
}

export function formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
}
