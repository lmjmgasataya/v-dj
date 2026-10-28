import { db } from "@/db";
import { batches, featureFlags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getVgLeaderOptions } from "@/lib/vgLeaderOptions";
import { RegisterForm } from "./RegisterForm";

function formatBatchDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
}

export default async function RegisterPage() {
  const [flags, vgLeaderOptions, [activeBatch]] = await Promise.all([
    db.select().from(featureFlags),
    getVgLeaderOptions(),
    // New registrants go into the default batch (see registerParticipant).
    db
      .select({ name: batches.name, classStartDate: batches.classStartDate, classEndDate: batches.classEndDate })
      .from(batches)
      .where(eq(batches.isDefault, true))
      .limit(1),
  ]);
  const flagMap = Object.fromEntries(flags.map((f) => [f.key, f.enabled]));

  return (
    <RegisterForm
      vgLeaderOptions={vgLeaderOptions}
      vgLeaderAutocomplete={flagMap["autocomplete_vg_leaders"] ?? true}
      disciplerAutocomplete={flagMap["autocomplete_disciplers"] ?? true}
      newDatePicker={flagMap["new_date_picker"] ?? false}
      activeBatch={
        activeBatch
          ? { name: activeBatch.name, classDates: `${formatBatchDate(activeBatch.classStartDate)} – ${formatBatchDate(activeBatch.classEndDate)}` }
          : null
      }
    />
  );
}
