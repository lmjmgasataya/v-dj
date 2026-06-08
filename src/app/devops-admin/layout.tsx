import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DevopsNav } from "./DevopsNav";

export default async function DevopsAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "developer") redirect("/");

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Developer only</p>
        <h2 className="text-2xl font-bold text-gray-900">Devops Admin</h2>
        <DevopsNav />
      </div>
      {children}
    </div>
  );
}
