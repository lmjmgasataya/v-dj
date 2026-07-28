import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ClaimForm } from "./ClaimForm";

export default async function ClaimPage() {
  const [flag] = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.key, "vg_leader_portal"))
    .limit(1);
  const enabled = flag?.enabled ?? false;

  if (!enabled) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-sm text-gray-500">
            The VG leader portal isn&apos;t available right now. Please contact an admin.
          </p>
        </div>
      </div>
    );
  }

  return <ClaimForm />;
}
