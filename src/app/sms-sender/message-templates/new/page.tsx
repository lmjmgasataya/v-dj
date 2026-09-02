import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NewTemplateForm } from "./NewTemplateForm";

export default async function NewMessageTemplatePage() {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 py-8 px-4">
      <div>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Discipleship Journey Portal", href: "/journey" },
            { label: "SMS Sender", href: "/sms-sender" },
            { label: "Message Templates", href: "/sms-sender/message-templates" },
            { label: "New Template" },
          ]}
        />
        <h2 className="text-2xl font-bold text-gray-900 mt-1">New Message Template</h2>
      </div>
      <NewTemplateForm />
    </div>
  );
}
