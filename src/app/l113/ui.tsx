/** Google-Form-style header card for the public L113 forms. */
export function FormHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-2xl w-full mx-auto rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="h-2 bg-[#00428E]" />
      <div className="p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Leadership 113</p>
        <h2 className="text-2xl font-bold text-gray-900 mt-1">{title}</h2>
        <p className="text-sm text-gray-600 mt-2">{description}</p>
      </div>
    </div>
  );
}

export function FormNotice({ children }: { children: React.ReactNode }) {
  return <p className="max-w-2xl w-full mx-auto rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">{children}</p>;
}

export const formCard = "rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-3";
