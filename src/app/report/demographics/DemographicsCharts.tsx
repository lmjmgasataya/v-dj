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

interface Row { label: string; count: number }

const LIFESTAGE_COLORS: Record<string, string> = {
  "Student (JHS/SHS)": "#818cf8",
  "Student (College)": "#6366f1",
  "Single": "#4f46e5",
  "Married": "#4338ca",
  "Single Parent": "#7c3aed",
  "Widow/Widower": "#a78bfa",
  "Senior": "#c4b5fd",
};

export function LifestageChart({ data }: { data: Row[] }) {
  if (data.length === 0) return <Empty />;
  const height = Math.max(200, data.length * 44);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "#374151" }} tickLine={false} axisLine={false} width={130} />
        <Tooltip
          cursor={{ fill: "#eef2ff" }}
          contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          formatter={(v) => [v, "Participants"]}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={32}>
          {data.map((d, i) => (
            <Cell key={i} fill={LIFESTAGE_COLORS[d.label] ?? "#6366f1"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ServiceChart({ data }: { data: Row[] }) {
  if (data.length === 0) return <Empty />;
  const height = Math.max(200, data.length * 44);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "#374151" }} tickLine={false} axisLine={false} width={130} />
        <Tooltip
          cursor={{ fill: "#faf5ff" }}
          contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          formatter={(v) => [v, "Participants"]}
        />
        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AgeChart({ data }: { data: Row[] }) {
  if (data.length === 0) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#374151" }} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} width={28} />
        <Tooltip
          cursor={{ fill: "#f0fdf4" }}
          contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          formatter={(v) => [v, "Participants"]}
        />
        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={64} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const GENDER_COLORS: Record<string, string> = {
  Male: "#6366f1",
  Female: "#ec4899",
};

export function GenderChart({ data, total }: { data: { label: string; count: number }[]; total: number }) {
  if (data.length === 0) return <Empty />;
  return (
    <div className="flex flex-col gap-3">
      {data.map((d) => {
        const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
        const color = GENDER_COLORS[d.label] ?? "#6366f1";
        return (
          <div key={d.label} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{d.label}</span>
              <span className="text-gray-500">{d.count} <span className="text-gray-400 text-xs">({pct}%)</span></span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ChurchChart({ data }: { data: Row[] }) {
  if (data.length === 0) return <Empty />;
  const height = Math.max(200, data.length * 44);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 40, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "#374151" }} tickLine={false} axisLine={false} width={130} />
        <Tooltip
          cursor={{ fill: "#fff7ed" }}
          contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb", fontSize: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          formatter={(v) => [v, "Participants"]}
        />
        <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function Empty() {
  return (
    <div className="flex items-center justify-center h-32 text-sm text-gray-400">
      No data for this period.
    </div>
  );
}
