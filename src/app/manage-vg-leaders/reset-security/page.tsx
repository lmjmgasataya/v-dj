import { db } from "@/db";
import { victoryGroupLeaders, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { resetVgLeaderSecurityQuestion } from "../actions";

export default async function ResetSecurityQuestionPage() {
  const vgLeaderAccounts = await db
    .select({
      id: users.id,
      name: users.name,
      securityQuestion: users.securityQuestion,
      createdAt: users.createdAt,
      leaderLastName: victoryGroupLeaders.lastName,
      leaderFirstName: victoryGroupLeaders.firstName,
    })
    .from(users)
    .innerJoin(victoryGroupLeaders, eq(users.vgLeaderId, victoryGroupLeaders.id))
    .where(eq(users.role, "vg_leader"))
    .orderBy(users.createdAt);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-800">VG Leader Accounts</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Accounts VG leaders set up themselves via the portal. Resetting clears their saved security
          question — they&apos;ll be asked to set a new one next time they access the portal.
        </p>
      </div>
      {vgLeaderAccounts.length === 0 ? (
        <p className="px-6 py-4 text-sm text-gray-400">No VG leader accounts yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {vgLeaderAccounts.map((account) => (
            <li key={account.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {account.leaderLastName}, {account.leaderFirstName}
                </p>
                {account.securityQuestion ? (
                  <p className="text-xs text-gray-400 mt-0.5">{account.securityQuestion}</p>
                ) : (
                  <span className="mt-1 inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    No security question set — will be prompted on next visit
                  </span>
                )}
              </div>
              <form action={resetVgLeaderSecurityQuestion.bind(null, account.id)}>
                <button
                  type="submit"
                  className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Reset security question
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
