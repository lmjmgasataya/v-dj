"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export function VictoryWeekendChart({ done, notDone }: { done: number; notDone: number }) {
  const total = done + notDone;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const data = [
    { name: "Done", value: done, color: "#10b981" },
    { name: "Not yet done", value: notDone, color: "#e5e7eb" },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0">
        <ResponsiveContainer width={200} height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={64}
              outerRadius={90}
              dataKey="value"
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                fontSize: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
              formatter={(value) => [`${value} (${total > 0 ? Math.round((Number(value) / total) * 100) : 0}%)`, ""]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-gray-800">{pct}%</span>
          <span className="text-xs text-gray-400 mt-0.5">done</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 w-full">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Done</p>
            <p className="text-2xl font-bold text-emerald-600">{done.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-gray-300 shrink-0" />
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Not yet done</p>
            <p className="text-2xl font-bold text-gray-500">{notDone.toLocaleString()}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Done = <code className="font-mono">isDoneWithVictoryWeekend</code> is true or <code className="font-mono">victoryDate</code> is filled
        </p>
      </div>
    </div>
  );
}
