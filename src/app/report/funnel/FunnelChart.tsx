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

interface FunnelBucket {
  label: string;
  count: number;
  sessions: number;
  total: number;
}

export function FunnelChart({ data }: { data: FunnelBucket[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        No data for this period.
      </div>
    );
  }

  const maxSessions = data[data.length - 1]?.total ?? 1;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#6b7280" }}
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
          cursor={{ fill: "#f3f4f6" }}
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            fontSize: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
          formatter={(value) => [value, "Participants"]}
          labelFormatter={(label) => label}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={56}>
          {data.map((entry) => {
            if (entry.sessions === 0) return <Cell key={entry.sessions} fill="#f87171" />;
            const ratio = entry.sessions / maxSessions;
            const opacity = 0.35 + ratio * 0.65;
            return (
              <Cell
                key={entry.sessions}
                fill={`rgba(99, 102, 241, ${opacity})`}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
