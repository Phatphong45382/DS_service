// Mock data for Sales Forecast Analytics

import { SalesData, Product, KPI } from "@/types";

// Generate 30 days of sales data
export const salesData: SalesData[] = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));

    return {
        date: date.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 500000) + 300000,
        orders: Math.floor(Math.random() * 200) + 100,
        customers: Math.floor(Math.random() * 150) + 80,
    };
});

// Top selling products
export const topProducts: Product[] = [
    { id: '1', name: 'Original Chips', sales: 1250, revenue: 312500, change: 12.5 },
    { id: '2', name: 'BBQ Chips', sales: 1100, revenue: 275000, change: 8.3 },
    { id: '3', name: 'Seaweed Crackers', sales: 950, revenue: 237500, change: -2.1 },
    { id: '4', name: 'Cheese Corn Stick', sales: 820, revenue: 205000, change: 15.2 },
    { id: '5', name: 'Sour Cream Chips', sales: 750, revenue: 187500, change: 5.8 },
    { id: '6', name: 'Hot Spicy Crackers', sales: 680, revenue: 170000, change: -5.4 },
    { id: '7', name: 'Wasabi Rice Cracker', sales: 620, revenue: 155000, change: 3.7 },
    { id: '8', name: 'Tom Yum Chips', sales: 580, revenue: 145000, change: 9.1 },
    { id: '9', name: 'Salted Egg Chips', sales: 520, revenue: 130000, change: -1.8 },
    { id: '10', name: 'Truffle Crackers', sales: 480, revenue: 120000, change: 6.4 },
];

// Category distribution data
export const categoryData = [
    { name: 'Chips', value: 45, color: '#FF8A5B' },
    { name: 'Crackers', value: 25, color: '#FFB74D' },
    { name: 'Corn Sticks', value: 20, color: '#FFCC80' },
    { name: 'Rice Crackers', value: 10, color: '#81C784' },
];

// KPI metrics
export const kpiMetrics: KPI[] = [
    {
        label: 'รายได้รวม',
        value: 12450000,
        trend: 12.5,
        format: 'currency',
    },
    {
        label: 'ยอดขาย',
        value: 8750,
        trend: 8.3,
        format: 'number',
    },
    {
        label: 'ลูกค้า',
        value: 3420,
        trend: 15.7,
        format: 'number',
    },
    {
        label: 'Conversion Rate',
        value: 39.1,
        trend: 3.2,
        format: 'percentage',
    },
];

// Format currency (Thai Baht)
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

// Format number with commas
export function formatNumber(value: number): string {
    return new Intl.NumberFormat('th-TH').format(value);
}

// Format percentage
export function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
}

// Format value based on type
export function formatValue(value: number, format: KPI['format']): string {
    switch (format) {
        case 'currency':
            return formatCurrency(value);
        case 'number':
            return formatNumber(value);
        case 'percentage':
            return formatPercentage(value);
        default:
            return value.toString();
    }
}
// Analytics: Sales Trend Data (6 months)
export const salesTrendData = [
    { month: 'Jan', sales: 4000, profit: 2400 },
    { month: 'Feb', sales: 3000, profit: 1398 },
    { month: 'Mar', sales: 2000, profit: 9800 },
    { month: 'Apr', sales: 2780, profit: 3908 },
    { month: 'May', sales: 1890, profit: 4800 },
    { month: 'Jun', sales: 2390, profit: 3800 },
    { month: 'Jul', sales: 3490, profit: 4300 },
];

// Analytics: Regional Sales Data
export const regionalSalesData = [
    { region: 'Bangkok', sales: 24000 },
    { region: 'Central', sales: 15000 },
    { region: 'North', sales: 9000 },
    { region: 'South', sales: 11000 },
    { region: 'East', sales: 8500 },
];

// Inventory: Mock Data
export const inventoryData = [
    { id: 1, name: 'Original Chips 75g', category: 'Chips', stock: 1200, status: 'In Stock', price: 35 },
    { id: 2, name: 'Seaweed Crackers 30g', category: 'Crackers', stock: 85, status: 'Low Stock', price: 25 },
    { id: 3, name: 'BBQ Chips 75g', category: 'Chips', stock: 0, status: 'Out of Stock', price: 35 },
    { id: 4, name: 'Hot Spicy Corn Stick 40g', category: 'Corn Sticks', stock: 500, status: 'In Stock', price: 20 },
    { id: 5, name: 'Cheese Corn Stick 150g', category: 'Corn Sticks', stock: 45, status: 'Low Stock', price: 55 },
    { id: 6, name: 'Sour Cream Chips 75g', category: 'Chips', stock: 320, status: 'In Stock', price: 35 },
    { id: 7, name: 'Salted Egg Rice Cracker 120g', category: 'Rice Crackers', stock: 210, status: 'In Stock', price: 45 },
];

// Customers: Mock Data
export const customerData = [
    { id: 1, name: 'Alex Morgan', email: 'alex@demo.com', totalSpent: 12500, lastOrder: '2023-10-25', type: 'VIP' },
    { id: 2, name: 'Sam Taylor', email: 'sam@demo.com', totalSpent: 4500, lastOrder: '2023-10-24', type: 'Returning' },
    { id: 3, name: 'Chris Lee', email: 'chris@demo.com', totalSpent: 890, lastOrder: '2023-10-20', type: 'New' },
    { id: 4, name: 'Dana Park', email: 'dana@demo.com', totalSpent: 22000, lastOrder: '2023-10-25', type: 'VIP' },
    { id: 5, name: 'Pat Chen', email: 'pat@demo.com', totalSpent: 3400, lastOrder: '2023-10-18', type: 'Returning' },
];
