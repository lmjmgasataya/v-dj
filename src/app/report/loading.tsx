export default function ReportLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
        <div className="h-7 w-56 rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
        <div className="bg-gray-50 border-b-2 border-gray-200 px-4 py-3 flex gap-4">
          <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 w-16 rounded bg-gray-200 animate-pulse" />
          ))}
          <div className="h-4 w-12 rounded bg-gray-200 animate-pulse" />
        </div>

        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className={`flex gap-4 px-4 py-2.5 border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
          >
            <div className="h-4 w-40 rounded bg-gray-200 animate-pulse shrink-0" />
            {Array.from({ length: 8 }).map((_, j) => (
              <div key={j} className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
            ))}
            <div className="h-4 w-12 rounded bg-gray-200 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
