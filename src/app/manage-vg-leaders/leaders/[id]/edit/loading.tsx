export default function Loading() {
  return (
    <div>
      <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between gap-4 animate-pulse">
        <div className="flex flex-col gap-1.5">
          <div className="h-4 w-40 rounded bg-gray-200" />
          <div className="h-3 w-56 rounded bg-gray-200" />
        </div>
        <div className="h-8 w-28 rounded-lg bg-gray-200 shrink-0" />
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-40 rounded bg-gray-200 animate-pulse" />
          <div className="h-3.5 w-32 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="h-8 w-16 rounded bg-gray-100 animate-pulse" />
      </div>

      <div className="flex flex-col gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
            <div className="h-3.5 w-40 rounded bg-indigo-200 animate-pulse" />
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="h-2.5 w-24 rounded bg-gray-100 animate-pulse" />
                <div className="h-9 w-full rounded-lg bg-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
            <div className="h-3.5 w-44 rounded bg-indigo-200 animate-pulse" />
          </div>
          <div className="p-6 flex flex-col gap-2.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-4 w-56 rounded bg-gray-100 animate-pulse" />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3 flex items-center justify-between">
            <div className="h-3.5 w-32 rounded bg-indigo-200 animate-pulse" />
            <div className="h-6 w-24 rounded-lg bg-indigo-200 animate-pulse" />
          </div>
          <div className="p-4 flex flex-col gap-3">
            <div className="h-16 w-full rounded-lg bg-gray-100 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
