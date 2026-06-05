import { ReportNav } from "./ReportNav";

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-6 items-start">
      <aside className="w-44 shrink-0 sticky top-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
          <ReportNav />
        </div>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
