import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { VgLoginForm } from "./VgLoginForm";

export default async function VgPortalLoginPage() {
  const session = await getSession();
  if (session) {
    if (session.role === "vg_leader") {
      redirect(session.mustChangePassword ? "/vg-portal/change-password" : "/vg-portal");
    }
    redirect("/");
  }

  return <VgLoginForm />;
}
