import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { getVgLeaderOptions } from "@/lib/vgLeaderOptions";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  const [flags, vgLeaderOptions] = await Promise.all([db.select().from(featureFlags), getVgLeaderOptions()]);
  const flagMap = Object.fromEntries(flags.map((f) => [f.key, f.enabled]));

  return (
    <RegisterForm
      vgLeaderOptions={vgLeaderOptions}
      vgLeaderAutocomplete={flagMap["autocomplete_vg_leaders"] ?? true}
      disciplerAutocomplete={flagMap["autocomplete_disciplers"] ?? true}
      newDatePicker={flagMap["new_date_picker"] ?? false}
    />
  );
}
