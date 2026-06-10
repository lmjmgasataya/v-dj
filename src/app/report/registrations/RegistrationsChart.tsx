"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export interface DayBreakdown {
  date: string;
  A: number;
  B: number;
  C: number;
  D: number;
}

const COLORS: Record<string, string> = {
  A: "#6366f1",
  B: "#a855f7",
  C: "#0ea5e9",
  D: "#10b981",
};

const LABELS: Record<string, string> = {
  A: "A — Adult w/ VD",
  B: "B — Student w/ VD",
  C: "C — Adult w/o VD",
  D: "D — Student w/o VD",
};

export function RegistrationsChart({ data }: { data: DayBreakdown[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        No registrations for this period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 48 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          angle={-45}
          textAnchor="end"
          interval="preserveStartEnd"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <Tooltip
          cursor={{ fill: "#eef2ff" }}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            fontSize: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
          formatter={(value, key) => [value, LABELS[key as string] ?? key]}
        />
        <Legend
          formatter={(value) => LABELS[value] ?? value}
          wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
        />
        {(["A", "B", "C", "D"] as const).map((cat) => (
          <Bar key={cat} dataKey={cat} stackId="a" fill={COLORS[cat]} radius={cat === "D" ? [4, 4, 0, 0] : [0, 0, 0, 0]} maxBarSize={48} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
