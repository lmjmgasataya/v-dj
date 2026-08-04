import { db } from "@/db";
import { classSessions, checkIns, participants, featureFlags, batches } from "@/db/schema";
import { and, count, eq, isNull, ne } from "drizzle-orm";
import { FEE_CATEGORIES } from "@/components/form";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ParticipantSearch } from "./ParticipantSearch";
import { AdminSessionArea } from "./AdminSessionArea";
import { WalkInForm } from "./WalkInForm";
import { CheckInSettingsButton } from "./CheckInSettingsButton";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; q?: string }>;
}) {
  const { session, q: initialQ = "" } = await searchParams;
  const sessionId = session ? parseInt(session, 10) : null;

  const defaultBatch = await db
    .select()
    .from(batches)
    .where(eq(batches.isDefault, true))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  const [sessions, feeBreakdown, flags] = await Promise.all([
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

    db.select().from(featureFlags),
  ]);

  const flagMap = Object.fromEntries(flags.map((f) => [f.key, f.enabled]));

  const registeredCount = feeBreakdown.reduce((s, r) => s + r.total, 0);
  const selectedSession = sessionId ? (sessions.find((s) => s.id === sessionId) ?? null) : null;

  const attendeeCount = selectedSession
    ? (
        await db
          .select({ count: count() })
          .from(checkIns)
          .where(and(eq(checkIns.classSessionId, selectedSession.id), ne(checkIns.status, "Absent")))
      )[0]?.count ?? 0
    : 0;

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
        <CheckInSettingsButton flags={flagMap} />
      </div>

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
        selectedId={sessionId}
        batchName={defaultBatch?.name}
        attendeeInfo={
          selectedSession
            ? { sessionId: selectedSession.id, sessionName: selectedSession.name, attendeeCount }
            : null
        }
      >
        {/* Step 2: Search participant */}
        {selectedSession && !selectedSession.allowsWalkIn && (
          <div id="search-participant" className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00428E] text-white text-xs font-bold shrink-0">2</span>
              <p className="text-sm font-semibold text-gray-700">
                Search Participant —{" "}
                <span className="text-indigo-600 font-medium">{selectedSession.name}</span>
              </p>
            </div>
            <ParticipantSearch key={selectedSession.id} sessionId={selectedSession.id} sessionName={selectedSession.name} isVictoryDay={selectedSession.isVictoryDay} requiresVictoryDay={selectedSession.requiresVictoryDay} initialQ={initialQ} qrCheckin={flagMap["qr_checkin"] ?? false} victoryDayAllowAllClasses={flagMap["victory_day_allow_all_classes"] ?? false} autoOpenQrScanner={flagMap["qr_auto_open_scanner"] ?? false} confirmBeforeCheckIn={flagMap["checkin_confirm_popup"] ?? true} showTableNumber={flagMap["checkin_table_assignment"] ?? true} autoCheckin={flagMap["checkin_autocheckin"] ?? false} />
          </div>
        )}

        {/* Step 2: Add walk-in */}
        {selectedSession && selectedSession.allowsWalkIn && (
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#00428E] text-white text-xs font-bold shrink-0">2.1</span>
              <p className="text-sm font-semibold text-gray-700">
                Add Walk-in —{" "}
                <span className="text-indigo-600 font-medium">{selectedSession.name}</span>
              </p>
            </div>
            <WalkInForm sessionId={selectedSession.id} newDatePicker={flagMap["new_date_picker"] ?? false} />
          </div>
        )}
      </AdminSessionArea>
    </div>
  );
}
