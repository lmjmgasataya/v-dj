"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { dayOfWeekEnum, vgFrequencyEnum } from "@/db/schema";
import { MultiSelectFilter } from "./MultiSelectFilter";

const DAYS = dayOfWeekEnum.enumValues;
const FREQUENCIES = vgFrequencyEnum.enumValues;

const LIFESTAGES = [
  "Student (JHS/SHS)",
  "Student (College)",
  "Single",
  "Married",
  "Single Parent",
  "Widow/Widower",
  "Senior",
];

const GENDERS = ["Male", "Female"];

const HOURS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 5; // 5 AM to 10 PM
  const ampm = h < 12 ? "AM" : "PM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:00 ${ampm}`;
});

export function VgReportFilters({
  gender,
  day,
  time,
  lifestage,
  frequency,
}: {
  gender: string[];
  day: string[];
  time: string[];
  lifestage: string[];
  frequency: string[];
}) {
  const router = useRouter();

  function buildUrl(overrides: Record<string, string[]>) {
    const vals = { gender, day, time, lifestage, frequency, ...overrides };
    const params = new URLSearchParams();
    if (vals.gender.length) params.set("gender", vals.gender.join(","));
    if (vals.day.length) params.set("day", vals.day.join(","));
    if (vals.time.length) params.set("time", vals.time.join(","));
    if (vals.lifestage.length) params.set("lifestage", vals.lifestage.join(","));
    if (vals.frequency.length) params.set("frequency", vals.frequency.join(","));
    const qs = params.toString();
    return `/manage-vg-leaders/vg-report${qs ? `?${qs}` : ""}`;
  }

  const hasFilters =
    gender.length > 0 || day.length > 0 || time.length > 0 || lifestage.length > 0 || frequency.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Filters</span>
      <MultiSelectFilter label="Gender" options={GENDERS} selected={gender} onChange={(v) => router.push(buildUrl({ gender: v }))} />
      <MultiSelectFilter label="Day" options={DAYS} selected={day} onChange={(v) => router.push(buildUrl({ day: v }))} />
      <MultiSelectFilter label="Time" options={HOURS} selected={time} onChange={(v) => router.push(buildUrl({ time: v }))} />
      <MultiSelectFilter label="Frequency" options={FREQUENCIES} selected={frequency} onChange={(v) => router.push(buildUrl({ frequency: v }))} />
      <MultiSelectFilter label="Life Stage" options={LIFESTAGES} selected={lifestage} onChange={(v) => router.push(buildUrl({ lifestage: v }))} />

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
