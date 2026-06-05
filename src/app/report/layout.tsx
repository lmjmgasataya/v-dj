import { ReportNav } from "./ReportNav";

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Fixed gutter sidebar — only when viewport is wide enough (2xl = 1536px).
          max-w-5xl (1024px) centered leaves ~256px on each side at 1536px,
          so a 192px sidebar at left-4 comfortably clears the content area. */}
      <div className="hidden 2xl:block fixed left-4 top-24 w-48">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
          <ReportNav />
        </div>
      </div>

      {/* Inline sidebar + content for smaller screens */}
      <div className="flex gap-6 items-start 2xl:block">
        <aside className="2xl:hidden w-44 shrink-0 sticky top-8 self-start">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
            <ReportNav />
          </div>
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </>
  );
}
