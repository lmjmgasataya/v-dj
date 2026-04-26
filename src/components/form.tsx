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

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
        <h2 className="text-sm font-semibold text-indigo-800 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">{children}</div>
    </div>
  );
}

export function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
