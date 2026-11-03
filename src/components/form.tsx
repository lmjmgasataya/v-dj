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

/**
 * Steps the Discipleship Journey Portal marks done from attendance (src/lib/djPortalJourney.ts).
 * VG leaders can't check these on their own profile; developers still can on the leader edit page,
 * except for DJ_PORTAL_ONLY_STEPS.
 */
export const AUTO_JOURNEY_STEPS: readonly string[] = ["Spiritual Foundations", "Making Disciples", "Empowering Leaders"];

/**
 * Automatic steps the Discipleship Journey Portal alone decides: the sync checks them for leaders
 * who completed them there and unchecks them for everyone else, overriding any manual answer.
 * Nobody can tick them by hand, developers included.
 */
export const DJ_PORTAL_ONLY_STEPS: readonly string[] = ["Spiritual Foundations"];

/**
 * Checked by the sync from attendance at the Victory Day sessions (Spiritual Foundations Day 1),
 * but unlike AUTO_JOURNEY_STEPS anyone can still check it by hand — either way counts.
 */
export const VICTORY_DAY_STEP = "Victory Weekend/Victory Day";

/** Every step the Discipleship Journey Portal can mark, in journey order — for reports. */
export const DJ_PORTAL_LINKED_STEPS: readonly string[] = [VICTORY_DAY_STEP, ...AUTO_JOURNEY_STEPS];

/**
 * A journey step the Discipleship Journey Portal marks from attendance — shown, not editable. The
 * hidden input keeps it in the form data so the "at least one step" check and the review count it;
 * the server keeps whatever is on record regardless.
 */
export function AutoJourneyStep({ step, done, note }: { step: string; done: boolean; note?: string | null }) {
  const row = (
    <div className="flex items-center gap-2.5 cursor-not-allowed" title="Marked automatically from the Discipleship Journey Portal">
      {done && <input type="hidden" name="discipleshipJourneyCompleted" value={step} />}
      <span
        className={`relative flex-shrink-0 w-4 h-4 rounded border-2 ${done ? "border-gray-400 bg-gray-400" : "border-gray-200 bg-gray-50"}`}
      >
        {done && (
          <svg
            className="absolute inset-0 m-auto w-2.5 h-2.5 text-white"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="1.5,6 4.5,9 10.5,3" />
          </svg>
        )}
      </span>
      <span className="text-sm text-gray-500 select-none leading-snug">
        {step} <span className="text-xs text-gray-400">(automatic)</span>
      </span>
    </div>
  );
  if (!note) return row;
  return (
    <div className="flex flex-col gap-0.5">
      {row}
      <p className="ml-6.5 text-xs text-amber-700">{note}</p>
    </div>
  );
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

// `new-ui:` classes only apply inside a [data-new-ui] container (see globals.css), so
// pages still on the old look are unaffected.
export const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent" +
  " new-ui:rounded-xl new-ui:bg-white new-ui:px-3.5 new-ui:py-2.5 new-ui:text-base new-ui:text-gray-900 new-ui:placeholder:text-gray-500 new-ui:focus:border-[#00428E] new-ui:focus:ring-[#00428E]/20 new-ui:disabled:bg-gray-100 new-ui:disabled:text-gray-600";

export const selectCls =
  inputCls +
  ` new-ui:appearance-none new-ui:bg-no-repeat new-ui:pr-10 new-ui:bg-[length:1.125rem] new-ui:bg-[position:right_0.75rem_center] new-ui:bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='%234b5563'%20stroke-width='2'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Cpath%20d='m6%209%206%206%206-6'/%3E%3C/svg%3E")]`;

const importantCls =
  "mt-0.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 uppercase tracking-wide" +
  " new-ui:mt-0 new-ui:rounded-md new-ui:bg-amber-50 new-ui:px-2 new-ui:text-xs new-ui:font-medium new-ui:normal-case new-ui:tracking-normal new-ui:text-amber-800 new-ui:ring-1 new-ui:ring-inset new-ui:ring-amber-600/25";

export function Section({ title, description, important, children }: { title: string; description?: string; important?: boolean | string; children: React.ReactNode }) {
  return (
    // No overflow-hidden: it would clip autocomplete dropdowns that extend past the card.
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm new-ui:rounded-2xl new-ui:border-0 new-ui:shadow-[0_1px_2px_rgba(15,23,42,0.05)] new-ui:ring-1 new-ui:ring-gray-200">
      <div className="bg-indigo-50 border-b border-indigo-100 rounded-t-xl px-6 py-3 new-ui:flex new-ui:flex-wrap new-ui:items-center new-ui:gap-x-2 new-ui:gap-y-1 new-ui:rounded-t-2xl new-ui:border-gray-100 new-ui:bg-transparent new-ui:pt-5 new-ui:pb-4">
        <h2 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide new-ui:text-lg new-ui:normal-case new-ui:tracking-normal new-ui:text-gray-900">{title}</h2>
        {important && <span className={importantCls}>{typeof important === "string" ? important : "Important"}</span>}
        {description && <p className="text-xs text-indigo-500 mt-0.5 new-ui:mt-0 new-ui:w-full new-ui:text-sm new-ui:text-gray-600">{description}</p>}
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
    <label className={`flex ${align === "start" ? "items-start" : "items-center"} gap-2.5 cursor-pointer group new-ui:gap-3 new-ui:py-1`}>
      <span className={`relative flex-shrink-0 w-4 h-4 new-ui:size-5${align === "start" ? " mt-0.5" : ""}`}>
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
        <span className="absolute inset-0 rounded border-2 border-gray-300 bg-white transition-colors group-hover:border-indigo-400 peer-checked:border-indigo-600 peer-checked:bg-[#00428E] peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400 peer-focus-visible:ring-offset-1 new-ui:rounded-md new-ui:border-gray-400 new-ui:group-hover:border-[#00428E] new-ui:peer-checked:border-[#00428E] new-ui:peer-focus-visible:ring-[#00428E]/40" />
        <svg
          className="absolute inset-0 m-auto w-2.5 h-2.5 new-ui:size-3 text-white opacity-0 peer-checked:opacity-100 scale-75 peer-checked:scale-100 transition-all duration-150 pointer-events-none"
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
      <span className={`text-sm text-gray-700 select-none leading-snug new-ui:text-base new-ui:text-gray-800${labelClassName ? ` ${labelClassName}` : ""}`}>
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
    <label className="flex items-center gap-2.5 cursor-pointer group new-ui:gap-3 new-ui:py-1">
      <span className="relative flex-shrink-0 w-4 h-4 new-ui:size-5">
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
        <span className="absolute inset-0 rounded-full border-2 border-gray-300 bg-white transition-colors group-hover:border-indigo-400 peer-checked:border-indigo-600 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-400 peer-focus-visible:ring-offset-1 new-ui:border-gray-400 new-ui:group-hover:border-[#00428E] new-ui:peer-checked:border-[#00428E] new-ui:peer-focus-visible:ring-[#00428E]/40" />
        <span className="absolute inset-0 m-auto w-2 h-2 new-ui:size-2.5 rounded-full bg-[#00428E] scale-0 peer-checked:scale-100 transition-transform duration-150 pointer-events-none" />
      </span>
      <span className="text-sm text-gray-700 group-hover:text-gray-900 select-none leading-tight new-ui:text-base new-ui:text-gray-800">
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
      <label className="block text-sm font-medium text-gray-700 mb-1 new-ui:mb-1.5 new-ui:text-gray-800">
        {label} {required && <span className="text-red-500 new-ui:text-red-600">*</span>}
        {important && <span className={`ml-1.5 ${importantCls}`}>Important</span>}
      </label>
      {children}
    </div>
  );
}
