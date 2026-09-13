import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { VgLeaderAdminNav } from "./VgLeaderAdminNav";

export default async function VgLeaderAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || (session.role !== "developer" && session.role !== "lead_pastor")) redirect("/");

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "VG Leader Portal", href: "/vg-leader-portal" }]} />
        <VgLeaderAdminNav />
      </div>
      {children}
    </div>
  );
}
