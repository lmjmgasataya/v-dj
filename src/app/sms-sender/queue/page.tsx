import { db } from "@/db";
import { featureFlags, smsLogs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default async function SmsQueuePage() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");

  const smsSenderFlag = await db
    .select({ enabled: featureFlags.enabled })
    .from(featureFlags)
    .where(eq(featureFlags.key, "sms_sender"))
    .then((r) => r[0]);
  if (!smsSenderFlag?.enabled) redirect("/");

  const logs = await db
    .select()
    .from(smsLogs)
    .orderBy(desc(smsLogs.createdAt))
    .limit(200);

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 py-8 px-4">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "SMS Sender", href: "/sms-sender" }, { label: "Queue" }]} />
        <h2 className="text-2xl font-bold text-gray-900">SMS Queue</h2>
        <p className="text-xs text-gray-400 mt-1">Most recent sends, kept for 5 days. Showing the latest {logs.length}.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2.5">Sent</th>
              <th className="px-4 py-2.5">Recipient</th>
              <th className="px-4 py-2.5">Number</th>
              <th className="px-4 py-2.5">Message</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-2.5 whitespace-nowrap text-gray-500">
                  {log.createdAt.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-gray-900">
                  {log.participantId ? (
                    <Link href={`/participants/${log.participantId}`} className="text-[#00428E] hover:underline">{log.recipientName}</Link>
                  ) : (
                    log.recipientName
                  )}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap font-mono text-gray-500">{log.recipientNumber}</td>
                <td className="px-4 py-2.5 text-gray-600 max-w-xs truncate" title={log.message}>{log.message}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      log.status === "sent" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {log.status === "sent" ? "Sent" : "Failed"}
                  </span>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No SMS sends recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
