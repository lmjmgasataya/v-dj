import { db } from "@/db";
import { batches, featureFlags, smsApiKeys, smsMessageTemplates } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SmsSenderClient } from "./SmsSenderClient";
import { ApiKeyEndpointEditor } from "./ApiKeyEndpointEditor";

export default async function SmsSenderPage() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");

  const smsSenderFlag = await db
    .select({ enabled: featureFlags.enabled })
    .from(featureFlags)
    .where(eq(featureFlags.key, "sms_sender"))
    .then((r) => r[0]);
  if (!smsSenderFlag?.enabled) redirect("/");

  const [batchList, templateList, defaultKey] = await Promise.all([
    db
      .select({
        id: batches.id,
        name: batches.name,
        classStartDate: batches.classStartDate,
        isDefault: batches.isDefault,
      })
      .from(batches)
      .orderBy(desc(batches.classStartDate)),
    db
      .select({
        id: smsMessageTemplates.id,
        title: smsMessageTemplates.title,
        message: smsMessageTemplates.message,
      })
      .from(smsMessageTemplates)
      .orderBy(desc(smsMessageTemplates.id)),
    db
      .select({ id: smsApiKeys.id, name: smsApiKeys.name, endpoint: smsApiKeys.endpoint, apiKey: smsApiKeys.apiKey })
      .from(smsApiKeys)
      .where(eq(smsApiKeys.isDefault, true))
      .limit(1)
      .then((r) => r[0] ?? null),
  ]);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 py-8 px-4">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Discipleship Journey Portal", href: "/journey" }, { label: "SMS Sender" }]} />
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900">SMS Sender</h2>
          <Link href="/sms-sender/queue" className="text-xs font-semibold text-[#00428E] hover:underline whitespace-nowrap mt-1.5">View SMS Queue →</Link>
        </div>
        <p className="text-xs font-semibold text-gray-400 tracking-widest mb-1">Send SMS to participants/other contacts in a batch.</p>
        <p className="text-xs text-gray-400 mt-1">
          {defaultKey
            ? <ApiKeyEndpointEditor apiKey={defaultKey} />
            : <span className="text-amber-600">No default SMS API key set. Configure one in <a href="/devops-admin" className="underline">DevOps Admin</a>.</span>
          }
        </p>
        <ol className="mt-2 text-xs text-gray-400 list-decimal list-inside space-y-0.5">
          <li>Open Traccar SMS Gateway App.</li>
          <li>Gateway Settings</li>
          <li>Enable</li>
          <li>Open Portwarp App</li>
          <li>Make sure the endpoint set is correct.</li>
          <li>Start the portwarp tunnel</li>
        </ol>
      </div>
      <SmsSenderClient batches={batchList} templates={templateList} defaultKey={defaultKey} />
    </div>
  );
}
