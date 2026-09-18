// Date helpers shared by the filters and the Run charts

// "YYYY-MM" for the month `offset` months from now
export function generateYearMonth(offset: number = 0): string {
    const date = new Date();
    date.setMonth(date.getMonth() + offset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

export function formatMonth(yearMonth: string): string {
    const [year, month] = yearMonth.split('-');
    const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
}
