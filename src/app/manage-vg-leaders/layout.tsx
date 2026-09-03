import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ManageVgLeadersNav } from "./ManageVgLeadersNav";

export default async function ManageVgLeadersLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || (session.role !== "developer" && session.role !== "lead_pastor")) redirect("/");

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "VG Leader Portal", href: "/vg-leader-portal" }, { label: "Manage VG Leaders" }]} />
        <h2 className="text-2xl font-bold text-gray-900">Manage VG Leaders</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage portal accounts and view VG leader reports.</p>
        <ManageVgLeadersNav />
      </div>
      {children}
    </div>
  );
}
