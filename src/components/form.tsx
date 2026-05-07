export const FEE_CATEGORIES = [
  { value: "A", description: "Adult with Victory Day",    label: "A — Adult with Victory Day",    amount: "₱1,200" },
  { value: "B", description: "Student with Victory Day",  label: "B — Student with Victory Day",  amount: "₱900" },
  { value: "C", description: "Adult without Victory Day", label: "C — Adult without Victory Day", amount: "₱900" },
  { value: "D", description: "Student without Victory Day", label: "D — Student without Victory Day", amount: "₱700" },
] as const;

export type FeeCategory = (typeof FEE_CATEGORIES)[number]["value"];

export function feeLabel(value: string | null | undefined): string {
  const cat = FEE_CATEGORIES.find((f) => f.value === value);
  return cat ? `${cat.label} (${cat.amount})` : (value ?? "—");
}

export const SERVICE_OPTIONS = [
  "9AM - Mandurriao",
  "11AM - Mandurriao",
  "2PM - Mandurriao",
  "4PM - Mandurriao",
  "6PM - Mandurriao",
  "10AM - Lapaz",
  "1PM - Lapaz",
];

export const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent";

export const selectCls = inputCls;

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
        <h2 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">{title}</h2>
        {description && <p className="text-xs text-indigo-500 mt-0.5">{description}</p>}
      </div>
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">{children}</div>
    </div>
  );
}

export function Field({
  label,
  required,
  important,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  important?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
        {important && <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Important</span>}
      </label>
      {children}
    </div>
  );
}
