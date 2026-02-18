"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

interface ScenarioData {
  month: string
  base: number
  scenario: number
  delta: number
}

interface ScenarioDeltaChartProps {
  data?: ScenarioData[]
}

export function ScenarioDeltaChart({ data }: ScenarioDeltaChartProps) {
  const chartData = data || []

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
        <XAxis
          dataKey="month"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          cursor={{ fill: 'transparent' }}
          contentStyle={{ borderRadius: "8px", border: "1px solid #e5e5e5" }}
          formatter={(value: number, name: string) => [value.toLocaleString(), name]}
        />
        <ReferenceLine y={0} stroke="#000" />
        <Bar dataKey="delta" name="Net Change (Units)" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.delta >= 0 ? "#10b981" : "#ef4444"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
