import { db } from "@/db";
import { smsMessageTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { EditTemplateForm } from "./EditTemplateForm";

export default async function EditMessageTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");

  const { id } = await params;
  const [template] = await db
    .select()
    .from(smsMessageTemplates)
    .where(eq(smsMessageTemplates.id, Number(id)));

  if (!template) notFound();

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 py-8 px-4">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "SMS Sender", href: "/sms-sender" },
            { label: "Message Templates", href: "/sms-sender/message-templates" },
            { label: "Edit Template" },
          ]}
        />
        <h2 className="text-2xl font-bold text-gray-900 mt-1">Edit Template</h2>
        <p className="text-sm text-gray-500 mt-0.5">{template.title}</p>
      </div>
      <EditTemplateForm template={template} />
    </div>
  );
}
