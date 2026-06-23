"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface ServiceCount {
  service: string;
  count: number;
}

export function ServiceChart({ data }: { data: ServiceCount[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        No data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 52)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 32, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="service"
          tick={{ fontSize: 12, fill: "#374151" }}
          tickLine={false}
          axisLine={false}
          width={160}
        />
        <Tooltip
          cursor={{ fill: "#eef2ff" }}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            fontSize: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
          formatter={(value) => [value, "Registrants"]}
        />
        <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={32} label={{ position: "right", fontSize: 11, fill: "#6b7280" }} />
      </BarChart>
    </ResponsiveContainer>
  );
}
