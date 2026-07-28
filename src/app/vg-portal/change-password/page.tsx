import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session || session.role !== "vg_leader") redirect("/");

  return <ChangePasswordForm forced={!!session.mustChangePassword} />;
}
