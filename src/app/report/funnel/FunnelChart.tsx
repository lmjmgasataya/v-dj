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
  /** count = present + absent (marked Absent for coming late, but they attended) */
  present: number;
  absent: number;
  sessions: number;
  total: number;
  sessionName: string;
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
    <ResponsiveContainer width="100%" height={380}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        {/* Short class names (SF Day 2, MD Day 1…), slanted so every one fits. */}
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-40}
          textAnchor="end"
          height={110}
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
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const bucket = payload[0].payload as FunnelBucket;
            return (
              <div
                style={{
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  fontSize: "12px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  background: "#fff",
                  padding: "8px 10px",
                }}
              >
                <p className="font-medium text-gray-700">
                  {bucket.count} participant{bucket.count !== 1 ? "s" : ""}
                </p>
                {bucket.absent > 0 && (
                  <p className="text-red-500 mt-0.5">
                    {bucket.absent} marked Absent (late)
                  </p>
                )}
                <p className="text-gray-400 mt-0.5">
                  {bucket.sessionName}
                </p>
              </div>
            );
          }}
        />
        <Bar dataKey="present" stackId="attendance" maxBarSize={56}>
          {data.map((entry) => {
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
        <Bar dataKey="absent" stackId="attendance" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={56} />
      </BarChart>
    </ResponsiveContainer>
  );
}
