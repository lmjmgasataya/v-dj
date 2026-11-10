import { db } from "@/db";
import { classSessions, batches, checkIns, participants } from "@/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BatchPicker } from "@/components/BatchPicker";
import { rawServiceValues } from "@/lib/timeService";
import { toTitleCase } from "@/lib/text";
import { SERVICE_OPTIONS } from "@/components/form";
import { BatchAttendanceTable } from "./BatchAttendanceTable";

export default async function AttendancePerBatchPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string }>;
}) {
  const authSession = await getSession();
  if (!authSession) redirect("/");
  const lockedServiceRawValues =
    authSession.role === "lead_pastor" ? rawServiceValues(authSession.timeService) : undefined;

  const { batch: batchParam } = await searchParams;

  // At most two waves: the batch list (only awaited first when there's no ?batch= and the
  // default has to be found), then sessions, registrants and check-ins together — check-ins
  // filtered by a subquery on the batch's sessions instead of waiting for their ids.
  const allBatchesQuery = db
    .select({ id: batches.id, name: batches.name, isDefault: batches.isDefault })
    .from(batches)
    .orderBy(batches.createdAt)
    .execute();
  const selectedBatchId = batchParam
    ? parseInt(batchParam, 10)
    : await allBatchesQuery.then((all) => (all.find((b) => b.isDefault) ?? all[0])?.id ?? null);

  const [allBatches, sessions, registrantRows, allCheckIns] = await Promise.all([
    allBatchesQuery,
    selectedBatchId !== null
      ? db
          .select({
            id: classSessions.id,
            name: classSessions.name,
            sessionDate: classSessions.sessionDate,
            isVictoryDay: classSessions.isVictoryDay,
          })
          .from(classSessions)
          .where(eq(classSessions.batchId, selectedBatchId))
          .orderBy(classSessions.sessionDate, classSessions.id)
      : [],
    selectedBatchId !== null
      ? db
          .select({
            id: participants.id,
            lastName: participants.lastName,
            firstName: participants.firstName,
            middleInitial: participants.middleInitial,
            registrationFee: participants.registrationFee,
            victoryDate: participants.victoryDate,
            serviceAttending: participants.serviceAttending,
          })
          .from(participants)
          .where(
            and(
              isNull(participants.deletedAt),
              eq(participants.isWalkIn, false),
              eq(participants.batchId, selectedBatchId),
              lockedServiceRawValues ? inArray(participants.serviceAttending, lockedServiceRawValues) : undefined
            )
          )
          .orderBy(participants.lastName, participants.firstName)
      : [],
    selectedBatchId !== null
      ? db
          .select({ participantId: checkIns.participantId, classSessionId: checkIns.classSessionId, status: checkIns.status })
          .from(checkIns)
          .where(
            inArray(
              checkIns.classSessionId,
              db.select({ id: classSessions.id }).from(classSessions).where(eq(classSessions.batchId, selectedBatchId))
            )
          )
      : [],
  ]);
  const selectedBatch = allBatches.find((b) => b.id === selectedBatchId) ?? null;
  // As before: a batch with no sessions shows no registrants.
  const registrants = sessions.length > 0 ? registrantRows : [];

  const statusByParticipant = new Map<number, Record<number, string>>();
  for (const c of allCheckIns) {
    const entry = statusByParticipant.get(c.participantId) ?? {};
    entry[c.classSessionId] = c.status;
    statusByParticipant.set(c.participantId, entry);
  }

  const rows = registrants.map((p) => ({
    id: p.id,
    name: `${toTitleCase(p.lastName)}, ${toTitleCase(p.firstName)}${p.middleInitial ? ` ${toTitleCase(p.middleInitial)}.` : ""}`,
    service: p.serviceAttending,
    // Fee categories C/D already had their Victory Day, so VD sessions don't count against them.
    skipsVictoryDay: p.registrationFee === "C" || p.registrationFee === "D",
    victoryDate: p.victoryDate,
    statuses: statusByParticipant.get(p.id) ?? {},
  }));

  // Only services someone in this batch actually attends, in the usual service order.
  const presentServices = new Set(rows.map((r) => r.service));
  const serviceOptions = [
    ...SERVICE_OPTIONS.filter((s) => presentServices.has(s)),
    ...Array.from(presentServices).filter((s) => !SERVICE_OPTIONS.includes(s)).sort(),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Discipleship Journey Portal", href: "/journey" },
            { label: "Attendance Per Discipleship Journey" },
          ]}
        />
        <h2 className="text-2xl font-bold text-gray-900">Attendance Per Discipleship Journey</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {rows.length} participant{rows.length !== 1 ? "s" : ""} · {sessions.length} session
          {sessions.length !== 1 ? "s" : ""} in {selectedBatch?.name ?? "—"}
        </p>
      </div>

      <BatchPicker batches={allBatches} selectedId={selectedBatchId} />

      {sessions.length === 0 ? (
        <p className="text-sm text-gray-400">No sessions for this batch.</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400">No participants found.</p>
      ) : (
        <BatchAttendanceTable key={selectedBatchId} sessions={sessions} rows={rows} serviceOptions={serviceOptions}
          batchName={selectedBatch?.name ?? "batch"}
        />
      )}
    </div>
  );
}
