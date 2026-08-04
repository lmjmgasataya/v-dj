import type { CheckInStatus } from "@/db/schema";

export { checkInStatusBadgeClass } from "@/lib/checkinStatus";

const STATUS_OPTIONS: { value: CheckInStatus; activeClass: string }[] = [
  { value: "On-time", activeClass: "border-green-500 bg-green-50 text-green-700" },
  { value: "Late", activeClass: "border-orange-500 bg-orange-50 text-orange-700" },
  { value: "Absent", activeClass: "border-red-500 bg-red-50 text-red-700" },
];

export function CheckInStatusPicker({
  value,
  onChange,
}: {
  value: CheckInStatus;
  onChange: (status: CheckInStatus) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {STATUS_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold text-center transition ${
              active ? opt.activeClass : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
            }`}
          >
            {opt.value}
          </button>
        );
      })}
    </div>
  );
}
