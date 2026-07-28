import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function VgPortalDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "vg_leader") redirect("/");
  if (session.mustChangePassword) redirect("/vg-portal/change-password");

  return <div className="max-w-3xl mx-auto flex flex-col gap-6">{children}</div>;
}
