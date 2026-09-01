export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-48 rounded bg-gray-200 animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="h-5 w-28 rounded-full bg-gray-100 animate-pulse" />
            <div className="h-5 w-32 rounded-full bg-gray-100 animate-pulse" />
            <div className="h-5 w-36 rounded-full bg-gray-100 animate-pulse" />
          </div>
          <div className="h-3.5 w-40 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="h-10 w-20 rounded-lg bg-indigo-200 animate-pulse shrink-0" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
          <div className="h-3.5 w-40 rounded bg-indigo-200 animate-pulse" />
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="h-2.5 w-24 rounded bg-gray-100 animate-pulse" />
              <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
          <div className="h-3.5 w-28 rounded bg-indigo-200 animate-pulse" />
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="h-2.5 w-32 rounded bg-gray-100 animate-pulse" />
              <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
          <div className="h-3.5 w-44 rounded bg-indigo-200 animate-pulse" />
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-5 w-24 rounded-full bg-gray-100 animate-pulse" />
            ))}
          </div>
          <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-3">
          <div className="h-3.5 w-32 rounded bg-indigo-200 animate-pulse" />
        </div>
        <div className="p-4 flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="px-4 py-3 rounded-lg border border-gray-200">
              <div className="h-4 w-32 rounded bg-gray-200 animate-pulse mb-2" />
              <div className="h-3.5 w-56 rounded bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
