"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts";

interface Bucket {
  time: string;
  count: number;
}

export function CheckInsChart({ data }: { data: Bucket[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        No check-ins recorded for this session.
      </div>
    );
  }

  const peak = Math.max(...data.map((d) => d.count));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          angle={-45}
          textAnchor="end"
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            fontSize: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
          formatter={(value) => [value, "Check-ins"]}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#6366f1"
          strokeWidth={2}
          dot={(props) => {
            const { cx, cy, payload } = props;
            const isPeak = payload.count === peak;
            return (
              <Dot
                key={`dot-${cx}-${cy}`}
                cx={cx}
                cy={cy}
                r={isPeak ? 5 : 3}
                fill={isPeak ? "#4f46e5" : "#fff"}
                stroke={isPeak ? "#4f46e5" : "#6366f1"}
                strokeWidth={2}
              />
            );
          }}
          activeDot={{ r: 5, fill: "#4f46e5" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
