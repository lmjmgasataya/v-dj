import { db } from "@/db";
import { smsMessageTemplates } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MessageTemplatesPage() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");

  const templates = await db
    .select()
    .from(smsMessageTemplates)
    .orderBy(desc(smsMessageTemplates.id));

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 py-8 px-4">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Discipleship Journey Portal", href: "/journey" },
            { label: "SMS Sender", href: "/sms-sender" },
            { label: "Message Templates" },
          ]}
        />
        <div className="flex items-center justify-between mt-1">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Message Templates</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {templates.length} template{templates.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/sms-sender/message-templates/new"
            className="bg-[#00428E] hover:bg-[#003578] text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + New Template
          </Link>
        </div>
      </div>

      {templates.length === 0 ? (
        <p className="text-sm text-gray-400">No templates yet.</p>
      ) : (
        <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
          {templates.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-4 pl-0 pr-5 py-4 hover:bg-gray-50 transition">
              <div className="shrink-0 w-8 text-right">
                <span className="text-xs text-gray-400 font-mono">{t.id}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 whitespace-pre-wrap">{t.message}</p>
              </div>
              <Link
                href={`/sms-sender/message-templates/${t.id}/edit`}
                className="shrink-0 text-sm text-[#00428E] hover:underline"
              >
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
