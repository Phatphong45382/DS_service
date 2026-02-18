// Mock data for Malee Sales Analytics

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
    { id: '1', name: 'Malee น้ำส้ม 100%', sales: 1250, revenue: 312500, change: 12.5 },
    { id: '2', name: 'Malee น้ำมะพร้าว', sales: 1100, revenue: 275000, change: 8.3 },
    { id: '3', name: 'Malee น้ำแอปเปิ้ล', sales: 950, revenue: 237500, change: -2.1 },
    { id: '4', name: 'Malee น้ำองุ่น', sales: 820, revenue: 205000, change: 15.2 },
    { id: '5', name: 'Malee น้ำผลไม้รวม', sales: 750, revenue: 187500, change: 5.8 },
    { id: '6', name: 'Malee น้ำเสาวรส', sales: 680, revenue: 170000, change: -5.4 },
    { id: '7', name: 'Malee น้ำสับปะรด', sales: 620, revenue: 155000, change: 3.7 },
    { id: '8', name: 'Malee น้ำมะม่วง', sales: 580, revenue: 145000, change: 9.1 },
    { id: '9', name: 'Malee น้ำลิ้นจี่', sales: 520, revenue: 130000, change: -1.8 },
    { id: '10', name: 'Malee น้ำฝรั่ง', sales: 480, revenue: 120000, change: 6.4 },
];

// Category distribution data
export const categoryData = [
    { name: 'Fruit Juices', value: 45, color: '#FF8A5B' }, // Warm Orange
    { name: 'Smoothies', value: 25, color: '#FFB74D' },    // Soft Orange
    { name: 'Tea & Coffee', value: 20, color: '#FFCC80' }, // Peach
    { name: 'Snacks', value: 10, color: '#81C784' },       // Soft Green
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
    { id: 1, name: 'Malee Orange Juice 100%', category: 'Fruit Juices', stock: 1200, status: 'In Stock', price: 69 },
    { id: 2, name: 'Malee Apple Juice', category: 'Fruit Juices', stock: 85, status: 'Low Stock', price: 65 },
    { id: 3, name: 'Malee Coconut Water', category: 'Smoothies', stock: 0, status: 'Out of Stock', price: 45 },
    { id: 4, name: 'Malee Pineapple Juice', category: 'Fruit Juices', stock: 500, status: 'In Stock', price: 60 },
    { id: 5, name: 'Malee Grape Juice', category: 'Fruit Juices', stock: 45, status: 'Low Stock', price: 75 },
    { id: 6, name: 'Malee Mixed Fruit', category: 'Smoothies', stock: 320, status: 'In Stock', price: 55 },
    { id: 7, name: 'Malee Lychee Juice', category: 'Fruit Juices', stock: 210, status: 'In Stock', price: 65 },
];

// Customers: Mock Data
export const customerData = [
    { id: 1, name: 'Somchai Jai-dee', email: 'somchai@email.com', totalSpent: 12500, lastOrder: '2023-10-25', type: 'VIP' },
    { id: 2, name: 'Somsri Rak-thai', email: 'somsri@email.com', totalSpent: 4500, lastOrder: '2023-10-24', type: 'Returning' },
    { id: 3, name: 'John Doe', email: 'john@email.com', totalSpent: 890, lastOrder: '2023-10-20', type: 'New' },
    { id: 4, name: 'Jane Smith', email: 'jane@email.com', totalSpent: 22000, lastOrder: '2023-10-25', type: 'VIP' },
    { id: 5, name: 'Pranee Meemark', email: 'pranee@email.com', totalSpent: 3400, lastOrder: '2023-10-18', type: 'Returning' },
];
