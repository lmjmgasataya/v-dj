"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface Row {
  label: string;
  count: number;
}

function Empty() {
  return <p className="text-sm text-gray-400 py-8 text-center">No data yet.</p>;
}

export function HorizontalBarChart({
  data,
  color = "#6366f1",
  colors,
  tooltipLabel = "VG Leaders",
}: {
  data: Row[];
  color?: string;
  colors?: Record<string, string>;
  tooltipLabel?: string;
}) {
  if (data.length === 0) return <Empty />;
  const height = Math.max(160, data.length * 44);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "#374151" }} tickLine={false} axisLine={false} width={150} />
        <Tooltip
          cursor={{ fill: "#eef2ff" }}
          contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          formatter={(v) => [v, tooltipLabel]}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {data.map((d, i) => (
            <Cell key={i} fill={colors?.[d.label] ?? color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AgeChart({ data }: { data: Row[] }) {
  if (data.length === 0) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#374151" }} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} width={28} />
        <Tooltip
          cursor={{ fill: "#f0fdf4" }}
          contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          formatter={(v) => [v, "VG Leaders"]}
        />
        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={64} />
      </BarChart>
    </ResponsiveContainer>
  );
}
