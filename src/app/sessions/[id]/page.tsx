import { db } from "@/db";
import { classSessions, checkIns, participants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = parseInt(id, 10);

  const [session] = await db
    .select()
    .from(classSessions)
    .where(eq(classSessions.id, sessionId))
    .limit(1);

  if (!session) notFound();

  const attendees = await db
    .select({
      checkInId: checkIns.id,
      checkedInAt: checkIns.checkedInAt,
      participantId: participants.id,
      lastName: participants.lastName,
      firstName: participants.firstName,
      middleInitial: participants.middleInitial,
      mobileNumber: participants.mobileNumber,
      lifestage: participants.lifestage,
      gender: participants.gender,
      serviceAttending: participants.serviceAttending,
      preferredNameOnId: participants.preferredNameOnId,
      registrationFee: participants.registrationFee,
    })
    .from(checkIns)
    .innerJoin(participants, eq(checkIns.participantId, participants.id))
    .where(eq(checkIns.classSessionId, sessionId))
    .orderBy(checkIns.checkedInAt);

  const dateStr = new Date(session.sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/sessions" className="text-sm text-indigo-600 hover:underline">← Sessions</Link>
          <h2 className="text-2xl font-bold text-gray-900 mt-1">{session.name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{dateStr}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-indigo-600">{attendees.length}</p>
          <p className="text-sm text-gray-400">checked in</p>
        </div>
      </div>

      {/* Attendee list */}
      {attendees.length === 0 ? (
        <div className="flex items-center justify-center h-40 rounded-xl border border-dashed border-gray-200 text-sm text-gray-400 bg-white">
          No check-ins recorded for this session yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">ID Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Mobile</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Lifestage</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Service</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Fee</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Check-in Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {attendees.map((a, i) => (
                <tr key={a.checkInId} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-400 font-mono">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {a.lastName}, {a.firstName}{a.middleInitial ? ` ${a.middleInitial}.` : ""}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{a.preferredNameOnId}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{a.mobileNumber}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{a.lifestage}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{a.serviceAttending}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      a.registrationFee === "Discounted"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {a.registrationFee}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(a.checkedInAt).toLocaleTimeString("en-PH", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
