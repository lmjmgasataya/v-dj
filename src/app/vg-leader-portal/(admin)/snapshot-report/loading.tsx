export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex items-center gap-3">
        <div className="h-9 w-48 rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-9 w-48 rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-9 w-28 rounded-lg bg-indigo-200 animate-pulse ml-auto" />
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="h-4 w-44 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 flex gap-6 animate-pulse">
            {[40, 90, 90, 70].map((w, j) => (
              <div key={j} className="h-3 rounded bg-gray-200" style={{ width: w }} />
            ))}
          </div>
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} className="flex gap-6 px-4 py-3 border-b border-gray-100 animate-pulse">
              <div className="h-4 w-32 rounded bg-gray-200" />
              <div className="h-4 w-16 rounded bg-gray-100" />
              <div className="h-4 w-16 rounded bg-gray-100" />
              <div className="h-4 w-12 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
