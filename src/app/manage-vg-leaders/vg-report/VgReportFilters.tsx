"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { dayOfWeekEnum } from "@/db/schema";
import { SERVICE_OPTIONS } from "@/components/form";

const DAYS = dayOfWeekEnum.enumValues;

const LIFESTAGES = [
  "Student (JHS/SHS)",
  "Student (College)",
  "Single",
  "Married",
  "Single Parent",
  "Widow/Widower",
  "Senior",
];

const HOURS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 5; // 5 AM to 10 PM
  const ampm = h < 12 ? "AM" : "PM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:00 ${ampm}`;
});

const selectCls =
  "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent";

export function VgReportFilters({
  gender,
  service,
  day,
  time,
  lifestage,
}: {
  gender: string;
  service: string;
  day: string;
  time: string;
  lifestage: string;
}) {
  const router = useRouter();

  function buildUrl(overrides: Record<string, string>) {
    const vals = { gender, service, day, time, lifestage, ...overrides };
    const params = new URLSearchParams();
    if (vals.gender) params.set("gender", vals.gender);
    if (vals.service) params.set("service", vals.service);
    if (vals.day) params.set("day", vals.day);
    if (vals.time) params.set("time", vals.time);
    if (vals.lifestage) params.set("lifestage", vals.lifestage);
    const qs = params.toString();
    return `/manage-vg-leaders/vg-report${qs ? `?${qs}` : ""}`;
  }

  const hasFilters = gender || service || day || time || lifestage;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        defaultValue={gender}
        onChange={(e) => router.push(buildUrl({ gender: e.target.value }))}
        className={selectCls}
      >
        <option value="">All Genders</option>
        <option value="Male">Male</option>
        <option value="Female">Female</option>
      </select>

      <select
        defaultValue={service}
        onChange={(e) => router.push(buildUrl({ service: e.target.value }))}
        className={selectCls}
      >
        <option value="">All Services</option>
        {SERVICE_OPTIONS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <select
        defaultValue={day}
        onChange={(e) => router.push(buildUrl({ day: e.target.value }))}
        className={selectCls}
      >
        <option value="">All Days</option>
        {DAYS.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      <select
        defaultValue={time}
        onChange={(e) => router.push(buildUrl({ time: e.target.value }))}
        className={selectCls}
      >
        <option value="">All Times</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>

      <select
        defaultValue={lifestage}
        onChange={(e) => router.push(buildUrl({ lifestage: e.target.value }))}
        className={selectCls}
      >
        <option value="">All Life Stages</option>
        {LIFESTAGES.map((ls) => (
          <option key={ls} value={ls}>{ls}</option>
        ))}
      </select>

      {hasFilters && (
        <Link
          href="/manage-vg-leaders/vg-report"
          className="bg-white border border-gray-300 text-gray-600 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition"
        >
          Clear
        </Link>
      )}
    </div>
  );
}
