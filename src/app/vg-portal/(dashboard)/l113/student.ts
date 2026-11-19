import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getStudentBatch } from "@/lib/l113Data";

/**
 * VG leader session for the L113 student pages, with their newest L113 batch (null if they
 * aren't a student). Without a session they log in first and come back to `path`.
 */
export async function requireL113Student(path: string) {
  const session = await getSession();
  if (!session) redirect(`/vg-portal/claim?callbackUrl=${encodeURIComponent(path)}`);
  if (session.role !== "vg_leader" || !session.vgLeaderId) redirect("/");
  const vgLeaderId = session.vgLeaderId;
  return { vgLeaderId, batch: await getStudentBatch(vgLeaderId) };
}
