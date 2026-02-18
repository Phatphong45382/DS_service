'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { GlobalFilters, ScenarioParams, GlobalSummary, KPI } from '@/types/planning';
import { generateYearMonth, globalSummary as initialGlobalSummary } from './planning-data';
import { getDashboardData, getDashboardFilters, getAnalyticsData, getAnalyticsFilters } from './api-client';
import { FilterOptionsResponse } from '@/types/planning';

// Helper interface matching Backend API
interface DashboardSummaryResponse {
    kpi: KPI;
    monthly_ts: {
        year: number;
        month: number;
        qty: number;
    }[];
    by_customer: {
        label: string;
        qty: number;
    }[];
    by_site: {
        label: string;
        qty: number;
    }[];
    top_products: {
        product_group: string;
        flavor: string;
        size: string;
        qty: number;
    }[];
    meta: any;
}

interface SalesMonthly {
    year_month: string;
    sales_qty: number;
    // Optional extras for compatibility
    flavor?: string;
    size?: string;
    channel?: string;
}

interface PlanningContextType {
    // Global filters (Applied)
    filters: GlobalFilters;
    setFilters: (filters: GlobalFilters) => void;
    updateFilters: (partial: Partial<GlobalFilters>) => void;
    applyFilters: (newFilters: GlobalFilters) => void;

    // Page Context
    activePage: 'overview' | 'analytics';
    setActivePage: (page: 'overview' | 'analytics') => void;

    // Pending filters (currently edited in drawer)
    pendingFilters: GlobalFilters;
    setPendingFilters: (filters: GlobalFilters) => void;
    updatePendingFilters: (partial: Partial<GlobalFilters>) => void;

    // UI state
    isDrawerOpen: boolean;
    setIsDrawerOpen: (open: boolean) => void;

    // Scenario parameters
    scenarioParams: ScenarioParams;
    setScenarioParams: (params: ScenarioParams) => void;

    // Global summary
    globalSummary: GlobalSummary | null;
    setGlobalSummary: (summary: GlobalSummary) => void;

    // Real Data (Adapted for backward compatibility)
    dashboardData: SalesMonthly[];

    // Full Aggregated Data (New)
    fullSummary: DashboardSummaryResponse | null;

    isLoading: boolean;
    filterOptions: {
        product_groups: string[];
        flavors: string[];
        sizes: string[];
        customers: string[];
        sites: string[];
        mechgroups: string[];
    } | null;
}

const PlanningContext = createContext<PlanningContextType | undefined>(undefined);

export function PlanningProvider({ children }: { children: ReactNode }) {
    const initialFilters: GlobalFilters = {
        product_group: 'all',
        flavor: 'all',
        size: 'all',
        customer: 'all',
        site: 'all',
        mechgroup: 'all',
        channel: 'all',
        has_promotion: 'all',
        date_range: {
            start: "2023-01",
            end: generateYearMonth(0), // Up to current month
        },
    };

    const [filters, setFilters] = useState<GlobalFilters>(initialFilters);
    const [pendingFilters, setPendingFilters] = useState<GlobalFilters>(initialFilters);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [activePage, setActivePage] = useState<'overview' | 'analytics'>('overview');

    const [scenarioParams, setScenarioParams] = useState<ScenarioParams>({
        horizon: 6,
        method: 'baseline',
        smoothing_window: 3,
        promo_enabled: false,
        promo_days: 0,
        discount_pct: 0,
        uplift_pct: 0,
        safety_stock_pct: 15,
    });

    const [globalSummary, setGlobalSummary] = useState<GlobalSummary | null>(initialGlobalSummary);
    const [dashboardData, setDashboardData] = useState<SalesMonthly[]>([]);
    const [fullSummary, setFullSummary] = useState<DashboardSummaryResponse | null>(null);
    const [filterOptions, setFilterOptions] = useState<FilterOptionsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch filter options (Cascade)
    useEffect(() => {
        async function fetchOptions() {
            try {
                // Prepare params for cascading
                const params: any = {};
                if (filters.product_group !== 'all') params.product_group = filters.product_group;
                if (filters.flavor !== 'all') params.flavor = filters.flavor;
                if (filters.customer !== 'all') params.customer = filters.customer;

                let options;
                if (activePage === 'analytics') {
                    options = await getAnalyticsFilters(params);
                } else {
                    options = await getDashboardFilters(params);
                }
                setFilterOptions(options);
            } catch (error) {
                console.error("Failed to fetch filter options:", error);
            }
        }
        fetchOptions();
    }, [activePage, filters.product_group, filters.flavor, filters.customer]); // Refetch when page or cascading keys change

    // Fetch dashboard data on applied filters change
    useEffect(() => {
        async function fetchData() {
            try {
                setIsLoading(true);

                // Construct query params from applied filters
                const params: any = {
                    year_from: parseInt(filters.date_range.start.split('-')[0]),
                    month_from: parseInt(filters.date_range.start.split('-')[1]),
                    year_to: parseInt(filters.date_range.end.split('-')[0]),
                    month_to: parseInt(filters.date_range.end.split('-')[1]),
                };

                if (filters.mechgroup && filters.mechgroup !== 'all') params.mechgroup = filters.mechgroup;
                if (filters.product_group !== 'all') params.product_group = filters.product_group;
                if (filters.flavor !== 'all') params.flavor = filters.flavor;
                if (filters.size !== 'all') params.size = String(filters.size);
                if (filters.customer && filters.customer !== 'all') params.customer = filters.customer;
                if (filters.site && filters.site !== 'all') params.site = filters.site;
                if (filters.mechgroup && filters.mechgroup !== 'all') params.mechgroup = filters.mechgroup;
                if (filters.has_promotion !== 'all') params.has_promotion = filters.has_promotion;

                let data: DashboardSummaryResponse;
                if (activePage === 'analytics') {
                    data = await getAnalyticsData(params) as unknown as DashboardSummaryResponse;
                } else {
                    data = await getDashboardData(params) as unknown as DashboardSummaryResponse;
                }

                setFullSummary(data);

                if (data.monthly_ts) {
                    const adapted: SalesMonthly[] = data.monthly_ts.map(ts => ({
                        year_month: `${ts.year}-${String(ts.month).padStart(2, '0')}`,
                        sales_qty: ts.qty,
                        flavor: 'All',
                        size: 'All',
                        channel: 'All'
                    }));
                    setDashboardData(adapted);

                    if (data.kpi) {
                        setGlobalSummary({
                            ...initialGlobalSummary,
                            total_revenue: data.kpi.total_qty * 15,
                            last_month_actual: data.monthly_ts.length > 0 ? data.monthly_ts[data.monthly_ts.length - 1].qty : 0,
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
                setDashboardData([]);
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, [filters, activePage]);

    const updateFilters = (partial: Partial<GlobalFilters>) => {
        const newFilters = { ...filters, ...partial };
        setFilters(newFilters);
        // Keep pending in sync for global controls (not in drawer)
        setPendingFilters(newFilters);
    };

    const updatePendingFilters = (partial: Partial<GlobalFilters>) => {
        setPendingFilters({ ...pendingFilters, ...partial });
    };

    const applyFilters = (newFilters: GlobalFilters) => {
        setFilters(newFilters);
        setIsDrawerOpen(false);
    };

    const contextValue = React.useMemo(() => ({
        filters,
        setFilters,
        updateFilters,
        applyFilters,
        activePage,
        setActivePage,
        pendingFilters,
        setPendingFilters,
        updatePendingFilters,
        isDrawerOpen,
        setIsDrawerOpen,
        scenarioParams,
        setScenarioParams,
        globalSummary,
        setGlobalSummary,
        dashboardData,
        fullSummary,
        filterOptions,
        isLoading
    }), [
        filters, activePage, pendingFilters, isDrawerOpen, scenarioParams,
        globalSummary, dashboardData, fullSummary, filterOptions, isLoading
    ]);

    return (
        <PlanningContext.Provider value={contextValue}>
            {children}
        </PlanningContext.Provider>
    );
}

export function usePlanning() {
    const context = useContext(PlanningContext);
    if (context === undefined) {
        throw new Error('usePlanning must be used within a PlanningProvider');
    }
    return context;
}
