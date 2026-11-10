import { db } from "@/db";
import { classSessions, checkIns, participants, featureFlags, batches, sessionVglCheckIns } from "@/db/schema";
import { and, count, eq, isNull, ne, sql } from "drizzle-orm";
import { FEE_CATEGORIES } from "@/components/form";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AdminSessionArea } from "./AdminSessionArea";
import { CheckInSettingsButton } from "./CheckInSettingsButton";
import { OfflineSyncBar } from "./OfflineSyncBar";
import { RosterPrefetcher } from "./RosterPrefetcher";
import { ConnectionStatus } from "./ConnectionStatus";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import Link from "next/link";
import { NewCheckinUiProvider } from "./ui/NewCheckinUi";
import { ChevronLeftIcon } from "./ui/icons";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; q?: string }>;
}) {
  const { session, q: initialQ = "" } = await searchParams;
  const sessionId = session ? parseInt(session, 10) : null;

  // Everything loads in one wave: the default batch is resolved inside each query
  // (`inDefaultBatch`) instead of being fetched first. (Check-ins don't re-render this
  // page — they return the session's new count instead; see AttendeeCounts.)
  const defaultBatchId = sql`(select ${batches.id} from ${batches} where ${batches.isDefault} limit 1)`;
  // A session/participant in the default batch — or every one when no batch is the default.
  const inDefaultBatch = (batchIdCol: typeof classSessions.batchId) =>
    sql`${batchIdCol} is not distinct from coalesce(${defaultBatchId}, ${batchIdCol})`;

  const [defaultBatch, flags, sessions, feeBreakdown, attendeeCountRows, vglAttendeeCountRows] = await Promise.all([
    db
      .select()
      .from(batches)
      .where(eq(batches.isDefault, true))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db.select().from(featureFlags),
    db.select().from(classSessions).where(inDefaultBatch(classSessions.batchId)).orderBy(classSessions.sessionDate),
    // No default batch → no rows (batch_id = null matches nothing), as before.
    db
      .select({ fee: participants.registrationFee, total: count() })
      .from(participants)
      .where(
        and(
          isNull(participants.deletedAt),
          eq(participants.isWalkIn, false),
          sql`${participants.batchId} = ${defaultBatchId}`
        )
      )
      .groupBy(participants.registrationFee)
      .orderBy(participants.registrationFee),
    // Fetched for every session up front (instead of just the selected one) so switching
    // sessions client-side never needs a server round trip — required for the session
    // picker to keep working offline (see AdminSessionArea).
    db
      .select({ sessionId: checkIns.classSessionId, total: count() })
      .from(checkIns)
      .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
      .where(
        and(inDefaultBatch(classSessions.batchId), eq(classSessions.vglOnly, false), ne(checkIns.status, "Absent"))
      )
      .groupBy(checkIns.classSessionId),
    db
      .select({ sessionId: sessionVglCheckIns.classSessionId, total: count() })
      .from(sessionVglCheckIns)
      .innerJoin(classSessions, eq(sessionVglCheckIns.classSessionId, classSessions.id))
      .where(
        and(inDefaultBatch(classSessions.batchId), eq(classSessions.vglOnly, true), ne(sessionVglCheckIns.status, "Absent"))
      )
      .groupBy(sessionVglCheckIns.classSessionId),
  ]);

  const flagMap = Object.fromEntries(flags.map((f) => [f.key, f.enabled]));

  const registeredCount = feeBreakdown.reduce((s, r) => s + r.total, 0);

  const attendeeCounts = Object.fromEntries([...attendeeCountRows, ...vglAttendeeCountRows].map((r) => [r.sessionId, r.total]));

  const sessionAreaProps = {
    sessions,
    initialSelectedId: sessionId,
    batchName: defaultBatch?.name,
    attendeeCounts,
    initialQ,
    qrCheckin: flagMap["qr_checkin"] ?? false,
    victoryDayAllowAllClasses: flagMap["victory_day_allow_all_classes"] ?? false,
    autoOpenQrScanner: flagMap["qr_auto_open_scanner"] ?? false,
    confirmBeforeCheckIn: flagMap["checkin_confirm_popup"] ?? true,
    showTableNumber: flagMap["checkin_table_assignment"] ?? true,
    autoCheckin: flagMap["checkin_autocheckin"] ?? false,
    autoCheckin915: flagMap["checkin_autocheckin_915"] ?? false,
    offlineCheckin: flagMap["offline_checkin"] ?? false,
    checkinTimeoutFallback: flagMap["checkin_timeout_fallback"] ?? false,
    newDatePicker: flagMap["new_date_picker"] ?? false,
  };

  const offlineTools = flagMap["offline_checkin"] && (
    <>
      <OfflineSyncBar />
      {/* VGL-only sessions have no participant roster to cache (and their check-in is online-only). */}
      <RosterPrefetcher sessions={sessions.filter((s) => !s.vglOnly)} victoryDayAllowAllClasses={flagMap["victory_day_allow_all_classes"] ?? false} qrCheckin={flagMap["qr_checkin"] ?? false} />
    </>
  );

  if (flagMap["new_ui_checkin"]) {
    const classBreakdown = feeBreakdown.map(({ fee, total }) => {
      const cat = FEE_CATEGORIES.find((f) => f.value === fee);
      return { label: cat ? `Class ${cat.value} (${cat.description})` : (fee ?? "Unknown"), total };
    });
    return (
      <NewCheckinUiProvider enabled>
        <div data-new-ui className="mx-auto flex max-w-2xl flex-col gap-4 caret-[#00428E] selection:bg-[#00428E]/15">
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href="/journey" className="-ml-1 inline-flex items-center gap-0.5 rounded text-sm font-medium text-gray-600 hover:text-gray-900">
                <ChevronLeftIcon className="size-4" />
                Discipleship Journey Portal
              </Link>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">Check-in</h2>
              {defaultBatch && <p className="text-sm text-gray-600">{defaultBatch.name}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2 pt-6">
              {flagMap["offline_checkin"] && <ConnectionStatus />}
              <CheckInSettingsButton flags={flagMap} />
            </div>
          </header>

          <ServiceWorkerRegister enabled={flagMap["offline_checkin"] ?? false} />
          {offlineTools}

          <AdminSessionArea {...sessionAreaProps} registeredCount={registeredCount} classBreakdown={classBreakdown} />
        </div>
      </NewCheckinUiProvider>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Discipleship Journey Portal", href: "/journey" }, { label: "Check-in" }]} />
          <h2 className="text-2xl font-bold text-gray-900">Admin / Check-in</h2>
          {defaultBatch && (
            <p className="text-sm text-gray-500 mt-0.5">{defaultBatch.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {flagMap["offline_checkin"] && <ConnectionStatus />}
          <CheckInSettingsButton flags={flagMap} />
        </div>
      </div>

      <ServiceWorkerRegister enabled={flagMap["offline_checkin"] ?? false} />

      {offlineTools}

      <div className="px-4 py-3 rounded-xl border border-indigo-100 bg-indigo-50 w-fit flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-indigo-600">{registeredCount}</span>
          <span className="text-sm text-indigo-500">
            registered participant{registeredCount !== 1 ? "s" : ""}
            {defaultBatch ? ` in ${defaultBatch.name}` : ""}
          </span>
        </div>
        {feeBreakdown.length > 0 && (
          <ul className="flex flex-col gap-0.5 pl-3 border-l-2 border-indigo-200">
            {feeBreakdown.map(({ fee, total }) => {
              const cat = FEE_CATEGORIES.find((f) => f.value === fee);
              return (
                <li key={fee} className="text-sm text-indigo-700">
                  <span className="font-semibold">{total}</span>
                  {" — "}
                  {cat ? `Class ${cat.value} (${cat.description})` : (fee ?? "Unknown")}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AdminSessionArea {...sessionAreaProps} />
    </div>
  );
}
