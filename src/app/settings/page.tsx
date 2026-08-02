import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { setCheckinFlag } from "./actions";

const CHECKIN_SETTINGS = [
  {
    key: "checkin_confirm_popup" as const,
    label: "Show confirmation popup before check-in",
    description:
      "When off, clicking Check In or scanning a QR code checks the participant in immediately and shows the success popup — no confirmation step in between.",
    default: true,
  },
  {
    key: "checkin_table_assignment" as const,
    label: "Assign table number on check-in",
    description: "When off, check-ins no longer assign a table number.",
    default: true,
  },
];

export default async function SettingsPage() {
  const session = await getSession();
  if (!session || session.role === "vg_leader") redirect("/");

  const flags = await db.select().from(featureFlags);
  const flagMap = Object.fromEntries(flags.map((f) => [f.key, f.enabled]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Settings" }]} />
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">Check-in behavior for this event.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <ul className="divide-y divide-gray-100">
          {CHECKIN_SETTINGS.map((setting) => {
            const enabled = flagMap[setting.key] ?? setting.default;
            return (
              <li key={setting.key} className="flex items-center justify-between gap-4 px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-800">{setting.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{setting.description}</p>
                </div>
                <form action={setCheckinFlag.bind(null, setting.key, !enabled)}>
                  <button
                    type="submit"
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      enabled ? "bg-[#00428E]" : "bg-gray-200"
                    }`}
                    aria-label={enabled ? "Disable" : "Enable"}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                        enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
