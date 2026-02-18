// Type definitions for Malee Sales Analytics

export interface SalesData {
    date: string;
    revenue: number;
    orders: number;
    customers: number;
}

export interface Product {
    id: string;
    name: string;
    sales: number;
    revenue: number;
    change: number; // Percentage change
}

export interface KPI {
    label: string;
    value: number;
    trend: number; // Percentage change
    format: 'currency' | 'number' | 'percentage';
    icon?: React.ReactNode;
}

export interface ChartDataPoint {
    name: string;
    value: number;
    [key: string]: any;
}
