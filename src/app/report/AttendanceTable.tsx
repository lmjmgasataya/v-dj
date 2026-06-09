import { db } from "@/db";
import { classSessions, checkIns, participants } from "@/db/schema";
import { and, eq, gte, ilike, isNull, lt, or } from "drizzle-orm";
import type { ClassSession } from "@/db/schema";

export function abbrev(name: string): string {
  return name
    .replace("Spiritual Foundations", "SF")
    .replace("Making Disciples", "MD")
    .replace(" - Victory Day", "");
}

function SessionHeader({ sessions }: { sessions: ClassSession[] }) {
  return (
    <thead>
      <tr>
        <th className="sticky left-0 z-20 bg-gray-50 border-b-2 border-r-2 border-gray-200 px-4 py-3 text-left font-semibold text-gray-700 min-w-[220px]">
          Participant
        </th>
        {sessions.map((s) => (
          <th
            key={s.id}
            title={s.name}
            className="bg-gray-50 border-b-2 border-r border-gray-200 px-3 py-3 text-center font-medium text-gray-600 min-w-[72px]"
          >
            <div className="flex flex-col gap-0.5 items-center">
              <span className="text-xs font-semibold text-gray-700 leading-snug whitespace-nowrap">
                {abbrev(s.name)}
              </span>
              <span className="text-[10px] text-gray-400 whitespace-nowrap">
                {new Date(s.sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                  timeZone: "Asia/Manila",
                })}
              </span>
              {s.isVictoryDay && (
                <span className="text-[9px] font-semibold text-indigo-400 uppercase tracking-wide">VD</span>
              )}
            </div>
          </th>
        ))}
        <th className="bg-gray-50 border-b-2 border-gray-200 px-4 py-3 text-center font-semibold text-gray-700 min-w-[64px]">
          Total
        </th>
      </tr>
    </thead>
  );
}

export function TableSkeleton({ sessions }: { sessions: ClassSession[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="text-sm border-collapse">
        <SessionHeader sessions={sessions} />
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => {
            const rowBg = i % 2 === 0 ? "bg-white" : "bg-gray-50";
            return (
              <tr key={i} className={rowBg}>
                <td className={`sticky left-0 z-10 ${rowBg} border-r-2 border-b border-gray-100 px-4 py-2.5`}>
                  <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
                </td>
                {sessions.map((s) => (
                  <td key={s.id} className="border-r border-b border-gray-100 px-3 py-2.5 text-center">
                    <div className="h-4 w-4 rounded bg-gray-200 animate-pulse mx-auto" />
                  </td>
                ))}
                <td className="border-b border-gray-100 px-4 py-2.5 text-center">
                  <div className="h-4 w-10 rounded bg-gray-200 animate-pulse mx-auto" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export async function AttendanceTable({
  year,
  query,
  sessions,
}: {
  year: number;
  query: string;
  sessions: ClassSession[];
}) {
  const [registrants, allCheckIns] = await Promise.all([
    db
      .select({
        id: participants.id,
        lastName: participants.lastName,
        firstName: participants.firstName,
        middleInitial: participants.middleInitial,
        registrationFee: participants.registrationFee,
        victoryDate: participants.victoryDate,
      })
      .from(participants)
      .where(
        and(
          isNull(participants.deletedAt),
          eq(participants.isWalkIn, false),
          gte(participants.createdAt, new Date(`${year}-01-01`)),
          lt(participants.createdAt, new Date(`${year + 1}-01-01`)),
          or(
            ilike(participants.lastName, `%${query}%`),
            ilike(participants.firstName, `%${query}%`)
          )
        )
      )
      .orderBy(participants.lastName, participants.firstName),

    db
      .select({ participantId: checkIns.participantId, classSessionId: checkIns.classSessionId })
      .from(checkIns)
      .innerJoin(classSessions, eq(checkIns.classSessionId, classSessions.id))
      .where(
        and(
          gte(classSessions.sessionDate, `${year}-01-01`),
          lt(classSessions.sessionDate, `${year + 1}-01-01`)
        )
      ),
  ]);

  const attended = new Set(allCheckIns.map((c) => `${c.participantId}-${c.classSessionId}`));

  if (registrants.length === 0) {
    return <p className="text-sm text-gray-400">No participants found for &ldquo;{query}&rdquo;.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="text-sm border-collapse">
        <SessionHeader sessions={sessions} />
        <tbody>
          {registrants.map((p, i) => {
            const skipsVictoryDay = p.registrationFee === "C" || p.registrationFee === "D";
            const applicableSessions = skipsVictoryDay
              ? sessions.filter((s) => !s.isVictoryDay)
              : sessions;
            const count = applicableSessions.filter((s) => attended.has(`${p.id}-${s.id}`)).length;
            const rowBg = i % 2 === 0 ? "bg-white" : "bg-gray-50";
            return (
              <tr key={p.id} className={rowBg}>
                <td className={`sticky left-0 z-10 ${rowBg} border-r-2 border-b border-gray-100 px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap capitalize`}>
                  {p.lastName}, {p.firstName}
                  {p.middleInitial ? ` ${p.middleInitial}.` : ""}
                </td>
                {sessions.map((s) => {
                  const done = attended.has(`${p.id}-${s.id}`);
                  const skipped = skipsVictoryDay && s.isVictoryDay;
                  return (
                    <td key={s.id} className="border-r border-b border-gray-100 px-3 py-2.5 text-center">
                      {done ? (
                        <svg
                          className="mx-auto w-4 h-4 text-green-600"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={6}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      ) : skipped ? (
                        <span
                          title={`Victory Day: ${p.victoryDate ?? "—"}`}
                          className="inline-flex items-center justify-center cursor-default"
                        >
                          <svg
                            className="w-4 h-4 text-gray-300"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                          </svg>
                        </span>
                      ) : (
                        <span className="text-gray-200 text-xs">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="border-b border-gray-100 px-4 py-2.5 text-center font-semibold text-indigo-600 whitespace-nowrap">
                  {count}/{applicableSessions.length}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
