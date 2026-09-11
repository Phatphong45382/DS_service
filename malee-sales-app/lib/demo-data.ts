import {
  aggregateByMonth,
  aggregateForecastByMonth,
  historicalData,
  latestForecast,
} from "./mock-data.ts";
import type { ParsedData } from "./file-utils.ts";

export const DEMO_FILE_NAME = "demo_sales_history.csv";

export function getDemoInputData(): ParsedData {
  const headers = [
    "customer",
    "destination",
    "year",
    "month",
    "product",
    "flavor",
    "size",
    "quantity",
    "planed_sales_from_start",
    "has_promotion",
    "discount_pct",
    "promo_days",
  ];
  const rows = historicalData.map((row) => {
    const [year, month] = row.date_month.split("-").map(Number);
    const size = row.sku.match(/\d+g$/)?.[0] ?? "75g";
    return {
      customer: "FreshMart",
      destination: "DC Central 1",
      year,
      month,
      product: "Chips",
      flavor: "Original",
      size,
      quantity: row.actual_units,
      planed_sales_from_start: row.plan_units,
      has_promotion: row.promo_flag ? 1 : 0,
      discount_pct: row.discount_pct,
      promo_days: row.promo_days,
    };
  });

  return {
    headers,
    rows,
    summary: {
      rowCount: rows.length,
      colCount: headers.length,
      emptyCells: 0,
    },
  };
}

export function createDemoForecastResult() {
  const actualByMonth = aggregateByMonth(historicalData, "actual_units");
  const forecastByMonth = aggregateForecastByMonth(latestForecast);

  return {
    filename: DEMO_FILE_NAME,
    demo: true,
    rows: [
      ...actualByMonth.map(({ month, value }) => ({
        date: month,
        sales: value,
        forecast: null,
      })),
      ...forecastByMonth.map(({ month, forecast }) => ({
        date: month,
        sales: null,
        forecast,
      })),
    ],
  };
}

export function downloadDemoForecastResult(rows: Array<Record<string, unknown>>): void {
  const headers = ["date", "sales", "forecast"];
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => row[header] ?? "").join(",")),
  ].join("\n");
  const link = document.createElement("a");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  link.href = url;
  link.download = DEMO_FILE_NAME;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
