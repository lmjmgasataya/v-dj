"use client";

import { useRouter } from "next/navigation";
import { createContext, useTransition, type ReactNode } from "react";
import { dayOfWeekEnum, vgFrequencyEnum } from "@/db/schema";
import { SERVICE_OPTIONS } from "@/components/form";
import { MultiSelectFilter } from "./MultiSelectFilter";

export const VgReportNavigationContext = createContext<((url: string) => void) | null>(null);

function ResultsSkeleton() {
  return (
    <>
      <div className="h-3.5 w-40 rounded bg-gray-200 animate-pulse -mt-2" />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 flex gap-6 animate-pulse">
          {[90, 80, 60, 60, 80, 90, 70].map((w, i) => (
            <div key={i} className="h-3 rounded bg-gray-200" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-6 px-4 py-3 border-b border-gray-100 animate-pulse">
            <div className="h-4 w-28 rounded bg-gray-200" />
            <div className="h-4 w-24 rounded bg-gray-100" />
            <div className="h-4 w-16 rounded bg-gray-100" />
            <div className="h-4 w-16 rounded bg-gray-100" />
            <div className="h-4 w-20 rounded bg-gray-100" />
            <div className="h-4 w-24 rounded bg-gray-100" />
            <div className="h-4 w-16 rounded bg-gray-100" />
          </div>
        ))}
      </div>

      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5 flex flex-col gap-3">
          <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
          <div className="h-36 w-full rounded-lg bg-gray-100 animate-pulse" />
        </div>
      ))}
    </>
  );
}

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
  service,
  day,
  time,
  lifestage,
  frequency,
  hideServiceFilter,
  children,
}: {
  gender: string[];
  service: string[];
  day: string[];
  time: string[];
  lifestage: string[];
  frequency: string[];
  hideServiceFilter?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function buildUrl(overrides: Record<string, string[]>) {
    const vals = { gender, service, day, time, lifestage, frequency, ...overrides };
    const params = new URLSearchParams();
    if (vals.gender.length) params.set("gender", vals.gender.join(","));
    if (vals.service.length) params.set("service", vals.service.join(","));
    if (vals.day.length) params.set("day", vals.day.join(","));
    if (vals.time.length) params.set("time", vals.time.join(","));
    if (vals.lifestage.length) params.set("lifestage", vals.lifestage.join(","));
    if (vals.frequency.length) params.set("frequency", vals.frequency.join(","));
    const qs = params.toString();
    return `/vg-leader-portal/vg-report${qs ? `?${qs}` : ""}`;
  }

  function go(url: string) {
    startTransition(() => router.push(url));
  }

  const hasFilters =
    gender.length > 0 || service.length > 0 || day.length > 0 || time.length > 0 || lifestage.length > 0 || frequency.length > 0;

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Filters</span>
        <MultiSelectFilter label="Gender" options={GENDERS} selected={gender} onChange={(v) => go(buildUrl({ gender: v }))} />
        {!hideServiceFilter && (
          <MultiSelectFilter label="Service" options={SERVICE_OPTIONS} selected={service} onChange={(v) => go(buildUrl({ service: v }))} />
        )}
        <MultiSelectFilter label="Day" options={DAYS} selected={day} onChange={(v) => go(buildUrl({ day: v }))} />
        <MultiSelectFilter label="Time" options={HOURS} selected={time} onChange={(v) => go(buildUrl({ time: v }))} />
        <MultiSelectFilter label="Frequency" options={FREQUENCIES} selected={frequency} onChange={(v) => go(buildUrl({ frequency: v }))} />
        <MultiSelectFilter label="Life Stage" options={LIFESTAGES} selected={lifestage} onChange={(v) => go(buildUrl({ lifestage: v }))} />

        {hasFilters && (
          <button
            type="button"
            onClick={() => go("/vg-leader-portal/vg-report")}
            className="bg-white border border-gray-300 text-gray-600 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            Clear
          </button>
        )}
      </div>

      <VgReportNavigationContext.Provider value={go}>
        {isPending ? <ResultsSkeleton /> : children}
      </VgReportNavigationContext.Provider>
    </>
  );
}
