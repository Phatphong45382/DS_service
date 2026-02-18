"use client"

import {
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Bar,
} from "recharts"

interface ScenarioData {
  month: string
  base: number
  scenario: number
  delta: number
}

interface ScenarioComparisonChartProps {
  data?: ScenarioData[]
}

export function ScenarioComparisonChart({ data }: ScenarioComparisonChartProps) {
  const chartData = data || []

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          label={{ value: "Forecast (Units)", angle: -90, position: "insideLeft", style: { fill: "#64748b", fontSize: 11 } }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickLine={false}
          axisLine={{ stroke: "#e2e8f0" }}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          label={{ value: "Delta (Units)", angle: 90, position: "insideRight", style: { fill: "#64748b", fontSize: 11 } }}
        />
        <Tooltip
          contentStyle={{
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: 12,
          }}
          formatter={(value: number, name: string) => {
            if (name === "Delta") return [`${value > 0 ? "+" : ""}${value.toLocaleString()}`, name]
            return [value.toLocaleString(), name]
          }}
        />
        <Legend wrapperStyle={{ paddingTop: 10 }} />

        {/* Delta as bars on right axis */}
        <Bar
          yAxisId="right"
          dataKey="delta"
          name="Delta"
          fill="#10b981"
          fillOpacity={0.3}
          stroke="#10b981"
          strokeWidth={1}
          radius={[4, 4, 0, 0]}
          barSize={30}
        />

        {/* Base forecast line */}
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="base"
          name="Base Forecast"
          stroke="#64748b"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ r: 4, fill: "#64748b", strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />

        {/* Scenario forecast line with area */}
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="scenario"
          name="Scenario Forecast"
          stroke="#3b82f6"
          strokeWidth={3}
          fill="#3b82f6"
          fillOpacity={0.1}
          dot={{ r: 5, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
          activeDot={{ r: 7 }}
        />

        {/* Zero line for delta reference */}
        <ReferenceLine yAxisId="right" y={0} stroke="#94a3b8" strokeDasharray="2 2" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
