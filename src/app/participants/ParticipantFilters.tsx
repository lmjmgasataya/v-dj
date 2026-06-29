"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { SERVICE_OPTIONS, FEE_CATEGORIES } from "@/components/form";

const LIFESTAGES = [
  "Student (JHS/SHS)",
  "Student (College)",
  "Single",
  "Married",
  "Single Parent",
  "Widow/Widower",
  "Senior",
];

const selectCls =
  "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent";

export function ParticipantFilters({
  q,
  lifestage,
  fee,
  gender,
  service,
  previousChurch,
  waterBaptism,
  victoryWeekend,
}: {
  q: string;
  lifestage: string;
  fee: string;
  gender: string;
  service: string;
  previousChurch: string;
  waterBaptism: string;
  victoryWeekend: string;
}) {
  const router = useRouter();

  function buildUrl(overrides: Record<string, string>) {
    const vals = { q, lifestage, fee, gender, service, previousChurch, waterBaptism, victoryWeekend, ...overrides };
    const params = new URLSearchParams();
    if (vals.q) params.set("q", vals.q);
    if (vals.lifestage) params.set("lifestage", vals.lifestage);
    if (vals.fee) params.set("fee", vals.fee);
    if (vals.gender) params.set("gender", vals.gender);
    if (vals.service) params.set("service", vals.service);
    if (vals.previousChurch) params.set("previousChurch", vals.previousChurch);
    if (vals.waterBaptism) params.set("waterBaptism", vals.waterBaptism);
    if (vals.victoryWeekend) params.set("victoryWeekend", vals.victoryWeekend);
    const qs = params.toString();
    return `/participants${qs ? `?${qs}` : ""}`;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    router.push(buildUrl({ q: (data.get("q") as string) ?? "", previousChurch: (data.get("previousChurch") as string) ?? "" }));
  }

  const hasFilters = q || lifestage || fee || gender || service || previousChurch || waterBaptism || victoryWeekend;

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or mobile number..."
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <input
          name="previousChurch"
          defaultValue={previousChurch}
          placeholder="Previous church..."
          className="w-48 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="submit"
          className="bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
        >
          Search
        </button>
        {hasFilters && (
          <Link
            href="/participants"
            className="bg-white border border-gray-300 text-gray-600 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="flex flex-wrap gap-2">
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

        <select
          defaultValue={fee}
          onChange={(e) => router.push(buildUrl({ fee: e.target.value }))}
          className={selectCls}
        >
          <option value="">All Fee Categories</option>
          {FEE_CATEGORIES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

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
          defaultValue={waterBaptism}
          onChange={(e) => router.push(buildUrl({ waterBaptism: e.target.value }))}
          className={selectCls}
        >
          <option value="">All (Water Baptism)</option>
          <option value="yes">Will undergo water baptism</option>
          <option value="no">Will not undergo water baptism</option>
        </select>

        <select
          defaultValue={victoryWeekend}
          onChange={(e) => router.push(buildUrl({ victoryWeekend: e.target.value }))}
          className={selectCls}
        >
          <option value="">All (Victory Weekend)</option>
          <option value="done">Done</option>
          <option value="not_done">Not yet done</option>
        </select>
      </div>
    </div>
  );
}
