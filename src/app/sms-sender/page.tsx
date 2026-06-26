import { db } from "@/db";
import { batches, featureFlags, smsApiKeys, smsMessageTemplates } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SmsSenderClient } from "./SmsSenderClient";

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
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "SMS Sender" }]} />
        <h2 className="text-2xl font-bold text-gray-900">SMS Sender</h2>
        <p className="text-xs font-semibold text-gray-400 tracking-widest mb-1">Send SMS to participants/other contacts in a batch.</p>
        <p className="text-xs text-gray-400 mt-1">
          {defaultKey
            ? <>Using API key: <span className="font-mono font-semibold text-gray-600">{defaultKey.name}</span></>
            : <span className="text-amber-600">No default SMS API key set. Configure one in <a href="/devops-admin" className="underline">DevOps Admin</a>.</span>
          }
        </p>
      </div>
      <SmsSenderClient batches={batchList} templates={templateList} defaultKey={defaultKey} />
    </div>
  );
}
