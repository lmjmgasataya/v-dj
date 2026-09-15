"use client";

import { useState } from "react";
import { TIME_SERVICES } from "@/lib/timeService";

const ROLES = [
  { value: "admin_volunteer", label: "admin_volunteer" },
  { value: "developer", label: "developer" },
  { value: "vg_leader", label: "vg_leader" },
  { value: "lead_pastor", label: "lead_pastor" },
];

export function RoleServiceSelect({
  roles = ROLES,
  defaultRole,
  defaultTimeService,
  compact = false,
}: {
  roles?: { value: string; label: string }[];
  defaultRole: string;
  defaultTimeService?: string | null;
  compact?: boolean;
}) {
  const [role, setRole] = useState(defaultRole);
  const cls = compact
    ? "text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
    : "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white";

  return (
    <>
      <select name="role" value={role} onChange={(e) => setRole(e.target.value)} className={cls}>
        {roles.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      {role === "lead_pastor" && (
        <select name="timeService" defaultValue={defaultTimeService ?? ""} required className={cls}>
          <option value="" disabled>Time Service…</option>
          {TIME_SERVICES.map((ts) => (
            <option key={ts} value={ts}>{ts}</option>
          ))}
        </select>
      )}
    </>
  );
}
