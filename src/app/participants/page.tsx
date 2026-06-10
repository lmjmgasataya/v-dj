import { Suspense } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { ParticipantList, ParticipantListSkeleton } from "./ParticipantList";

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const [{ q = "", page: pageParam }, session] = await Promise.all([searchParams, getSession()]);
  const isDeveloper = session?.role === "developer";
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Participants" }]} />
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Participants</h2>
          <div className="flex items-center gap-3">
            <a
              href="/api/participants/export"
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              <span>↓</span> Export Excel
            </a>
            <Link href="/participants/deleted" className="text-xs text-gray-400 hover:text-gray-600 hover:underline">View deleted</Link>
          </div>
        </div>
      </div>

      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name or mobile number..."
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
        >
          Search
        </button>
        {q && (
          <Link
            href="/participants"
            className="bg-white border border-gray-300 text-gray-600 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            Clear
          </Link>
        )}
      </form>

      <Suspense key={`${q}-${page}`} fallback={<ParticipantListSkeleton />}>
        <ParticipantList q={q} page={page} isDeveloper={isDeveloper} />
      </Suspense>
    </div>
  );
}
