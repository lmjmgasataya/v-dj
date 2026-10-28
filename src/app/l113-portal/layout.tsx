import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function L113PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || (session.role !== "developer" && session.role !== "lead_pastor")) redirect("/");

  return <div className="max-w-4xl mx-auto flex flex-col gap-6">{children}</div>;
}
