import { db } from "@/db";
import { participants } from "@/db/schema";
import { isNotNull, desc } from "drizzle-orm";
import Link from "next/link";
import { RestoreButton } from "./RestoreButton";

export default async function DeletedParticipantsPage() {
  const rows = await db
    .select()
    .from(participants)
    .where(isNotNull(participants.deletedAt))
    .orderBy(desc(participants.deletedAt));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Deleted Participants</h2>
          <p className="text-sm text-gray-500 mt-0.5">{rows.length} record{rows.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/participants" className="text-sm text-indigo-600 hover:underline">← Back to list</Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">No deleted participants.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((p) => {
            const deletedAt = p.deletedAt
              ? new Date(p.deletedAt).toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";
            return (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4"
              >
                <div>
                  <p className="font-semibold text-gray-900">
                    {p.lastName}, {p.firstName} {p.middleInitial ? `${p.middleInitial}.` : ""}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">{p.mobileNumber} · {p.lifestage}</p>
                  <p className="text-xs text-red-400 mt-1">Deleted {deletedAt}</p>
                </div>
                <RestoreButton id={p.id} name={`${p.lastName}, ${p.firstName}`} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
