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

export const DISCIPLESHIP_JOURNEY_STEPS = [
  "One2One",
  "Victory Weekend/Victory Day",
  "Spiritual Foundations",
  "Church Community",
  "Purple Book Class",
  "Making Disciples",
  "Empowering Leaders",
] as const;

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

export function Section({ title, description, important, children }: { title: string; description?: string; important?: boolean | string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
        <h2 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">{title}</h2>
        {important && <span className="mt-0.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wide">{typeof important === "string" ? important : "Important"}</span>}
        {description && <p className="text-xs text-indigo-500 mt-0.5">{description}</p>}
      </div>
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">{children}</div>
    </div>
  );
}

export function CheckboxOption({
  name,
  value,
  children,
  required,
  defaultChecked,
  checked,
  onChange,
  align = "center",
  labelClassName,
}: {
  name: string;
  value?: string;
  children: React.ReactNode;
  required?: boolean;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  align?: "center" | "start";
  labelClassName?: string;
}) {
  return (
    <label className={`flex ${align === "start" ? "items-start" : "items-center"} gap-2.5 cursor-pointer group`}>
      <span className={`relative flex-shrink-0 w-4 h-4${align === "start" ? " mt-0.5" : ""}`}>
        <input
          type="checkbox"
          name={name}
          value={value}
          required={required}
          defaultChecked={defaultChecked}
          checked={checked}
          onChange={onChange}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded border-2 border-gray-300 bg-white transition-colors group-hover:border-indigo-400 peer-checked:border-indigo-600 peer-checked:bg-[#00428E] peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400 peer-focus-visible:ring-offset-1" />
        <svg
          className="absolute inset-0 m-auto w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 scale-75 peer-checked:scale-100 transition-all duration-150 pointer-events-none"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="1.5,6 4.5,9 10.5,3" />
        </svg>
      </span>
      <span className={`text-sm text-gray-700 select-none leading-snug${labelClassName ? ` ${labelClassName}` : ""}`}>
        {children}
      </span>
    </label>
  );
}

export function RadioOption({
  name,
  value,
  label,
  required,
  checked,
  defaultChecked,
  onChange,
}: {
  name: string;
  value: string;
  label: string;
  required?: boolean;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: () => void;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <span className="relative flex-shrink-0 w-4 h-4">
        <input
          type="radio"
          name={name}
          value={value}
          required={required}
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={onChange && (() => onChange())}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full border-2 border-gray-300 bg-white transition-colors group-hover:border-indigo-400 peer-checked:border-indigo-600 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400 peer-focus-visible:ring-offset-1" />
        <span className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-[#00428E] scale-0 peer-checked:scale-100 transition-transform duration-150 pointer-events-none" />
      </span>
      <span className="text-sm text-gray-700 group-hover:text-gray-900 select-none leading-tight">
        {label}
      </span>
    </label>
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
