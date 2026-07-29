export function TablesResultsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex flex-col gap-2">
            <div className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
            <div className="h-7 w-20 rounded bg-gray-200 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-4 flex flex-col gap-2">
            <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
            <div className="h-3 w-full rounded bg-gray-100 animate-pulse" />
            <div className="h-3 w-full rounded bg-gray-100 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
