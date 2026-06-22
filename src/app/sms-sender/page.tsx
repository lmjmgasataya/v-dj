import { db } from "@/db";
import { batches, smsMessageTemplates } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SmsSenderClient } from "./SmsSenderClient";

export default async function SmsSenderPage() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");

  const [batchList, templateList] = await Promise.all([
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
  ]);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 py-8 px-4">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "SMS Sender" }]} />
        <h2 className="text-2xl font-bold text-gray-900">SMS Sender</h2>
        <p className="text-xs font-semibold text-gray-400 tracking-widest mb-1">Send SMS to participants/other contacts in a batch.</p>
      </div>
      <SmsSenderClient batches={batchList} templates={templateList} />
    </div>
  );
}
