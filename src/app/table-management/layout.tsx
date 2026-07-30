import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { TableManagementNav } from "./TableManagementNav";

export default async function TableManagementLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Table Management" }]} />
        <h2 className="text-2xl font-bold text-gray-900">Table Management</h2>
        <p className="text-sm text-gray-500 mt-0.5">Table assignments and seating capacity</p>
      </div>

      <TableManagementNav isDeveloper={session.role === "developer"} />

      {children}
    </div>
  );
}
