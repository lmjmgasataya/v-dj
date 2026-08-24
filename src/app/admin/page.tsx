import { db } from "@/db";
import { classSessions, checkIns, participants, featureFlags, batches } from "@/db/schema";
import { and, count, eq, inArray, isNull, ne } from "drizzle-orm";
import { FEE_CATEGORIES } from "@/components/form";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AdminSessionArea } from "./AdminSessionArea";
import { CheckInSettingsButton } from "./CheckInSettingsButton";
import { OfflineSyncBar } from "./OfflineSyncBar";
import { RosterPrefetcher } from "./RosterPrefetcher";
import { ConnectionStatus } from "./ConnectionStatus";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; q?: string }>;
}) {
  const { session, q: initialQ = "" } = await searchParams;
  const sessionId = session ? parseInt(session, 10) : null;

  // featureFlags doesn't depend on the default batch, so fetch it alongside
  // instead of after — this page re-renders on every check-in via
  // revalidatePath, so shaving a round trip here matters.
  const [defaultBatch, flags] = await Promise.all([
    db
      .select()
      .from(batches)
      .where(eq(batches.isDefault, true))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db.select().from(featureFlags),
  ]);

  const [sessions, feeBreakdown] = await Promise.all([
    defaultBatch
      ? db
          .select()
          .from(classSessions)
          .where(eq(classSessions.batchId, defaultBatch.id))
          .orderBy(classSessions.sessionDate)
      : db.select().from(classSessions).orderBy(classSessions.sessionDate),

    defaultBatch
      ? db
          .select({ fee: participants.registrationFee, total: count() })
          .from(participants)
          .where(
            and(
              isNull(participants.deletedAt),
              eq(participants.isWalkIn, false),
              eq(participants.batchId, defaultBatch.id)
            )
          )
          .groupBy(participants.registrationFee)
          .orderBy(participants.registrationFee)
      : [],
  ]);

  const flagMap = Object.fromEntries(flags.map((f) => [f.key, f.enabled]));

  const registeredCount = feeBreakdown.reduce((s, r) => s + r.total, 0);

  // Fetched for every session up front (instead of just the selected one) so
  // switching sessions client-side never needs a server round trip — required
  // for the session picker to keep working offline (see AdminSessionArea).
  const attendeeCountRows = sessions.length
    ? await db
        .select({ sessionId: checkIns.classSessionId, total: count() })
        .from(checkIns)
        .where(and(inArray(checkIns.classSessionId, sessions.map((s) => s.id)), ne(checkIns.status, "Absent")))
        .groupBy(checkIns.classSessionId)
    : [];
  const attendeeCounts = Object.fromEntries(attendeeCountRows.map((r) => [r.sessionId, r.total]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Check-in" }]} />
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

      {flagMap["offline_checkin"] && (
        <>
          <OfflineSyncBar />
          <RosterPrefetcher sessions={sessions} victoryDayAllowAllClasses={flagMap["victory_day_allow_all_classes"] ?? false} qrCheckin={flagMap["qr_checkin"] ?? false} />
        </>
      )}

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

      <AdminSessionArea
        sessions={sessions}
        initialSelectedId={sessionId}
        batchName={defaultBatch?.name}
        attendeeCounts={attendeeCounts}
        initialQ={initialQ}
        qrCheckin={flagMap["qr_checkin"] ?? false}
        victoryDayAllowAllClasses={flagMap["victory_day_allow_all_classes"] ?? false}
        autoOpenQrScanner={flagMap["qr_auto_open_scanner"] ?? false}
        confirmBeforeCheckIn={flagMap["checkin_confirm_popup"] ?? true}
        showTableNumber={flagMap["checkin_table_assignment"] ?? true}
        autoCheckin={flagMap["checkin_autocheckin"] ?? false}
        autoCheckin915={flagMap["checkin_autocheckin_915"] ?? false}
        offlineCheckin={flagMap["offline_checkin"] ?? false}
        newDatePicker={flagMap["new_date_picker"] ?? false}
      />
    </div>
  );
}
