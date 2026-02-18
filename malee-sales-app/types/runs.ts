// Type definitions for the Runs system

export type RunStatus = "success" | "running" | "failed" | "queued";

export interface ForecastRun {
  id: string;
  createdAt: string; // ISO date
  completedAt?: string;
  status: RunStatus;
  modelName: string;
  modelVersion: string;
  dataSource: string;
  horizon: number; // months
  owner: string;
  notes?: string;
  durationSeconds?: number;
}

export interface ForecastPoint {
  month: string; // e.g. "2025-01", "Jan 2025"
  actual?: number;
  forecast: number;
  p10?: number;
  p90?: number;
  plan?: number;
}

export interface ExecutiveKPI {
  label: string;
  value: string;
  subValue?: string;
  delta?: string;
  deltaPercent?: string;
  deltaDirection?: "up" | "down" | "flat";
  type: "forecast" | "delta" | "risk" | "confidence";
}

export interface RiskAssessment {
  level: "High" | "Medium" | "Low";
  highRiskMonths: string[];
  summary: string;
}

export interface ConfidenceLevel {
  level: "High" | "Medium" | "Low";
  reasons: string[];
}

export interface RecommendedAction {
  productionVolume: string;
  safetyStockPercent: number;
  stockoutRiskMonths: string[];
  overstockRiskMonths: string[];
  assumptions: string[];
}

export interface DriverContribution {
  feature: string;
  impact: number; // percentage contribution
  direction: "positive" | "negative";
  description?: string;
}

export interface ValidationIssue {
  type: "missing_column" | "date_gap" | "duplicate" | "outlier";
  severity: "error" | "warning" | "info";
  message: string;
  count: number;
}

export interface SchemaColumn {
  name: string;
  type: string;
  nonNullCount: number;
  totalCount: number;
  sampleValues: string[];
}

export interface LogEntry {
  timestamp: string;
  level: "info" | "warning" | "error";
  message: string;
}

export interface ValidationReport {
  issues: ValidationIssue[];
  schema: SchemaColumn[];
  sampleRows: Record<string, string | number>[];
  logs: LogEntry[];
}

export interface RunReport {
  run: ForecastRun;
  kpis: ExecutiveKPI[];
  risk: RiskAssessment;
  confidence: ConfidenceLevel;
  recommendedActions: RecommendedAction;
  forecastData: ForecastPoint[];
  drivers: DriverContribution[];
  narrative: string;
  previousRunComparison?: string[];
  validation: ValidationReport;
}

export interface CompareResult {
  runA: ForecastRun;
  runB: ForecastRun;
  overlayData: {
    month: string;
    forecastA: number;
    forecastB: number;
    p10A?: number;
    p90A?: number;
    p10B?: number;
    p90B?: number;
    actualA?: number;
    actualB?: number;
    delta: number;
    deltaPercent: number;
  }[];
  kpiDeltas: {
    label: string;
    valueA: string;
    valueB: string;
    delta: string;
    direction: "better" | "worse" | "neutral";
  }[];
}
