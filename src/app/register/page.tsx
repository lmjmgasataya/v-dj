import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  const flags = await db.select().from(featureFlags);
  const flagMap = Object.fromEntries(flags.map((f) => [f.key, f.enabled]));

  return (
    <RegisterForm
      vgLeaderAutocomplete={flagMap["autocomplete_vg_leaders"] ?? true}
      disciplerAutocomplete={flagMap["autocomplete_disciplers"] ?? true}
      newDatePicker={flagMap["new_date_picker"] ?? false}
    />
  );
}
