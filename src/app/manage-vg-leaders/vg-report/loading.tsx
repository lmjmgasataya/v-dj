export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-2">
        <div className="h-3.5 w-12 rounded bg-gray-200 animate-pulse mr-1" />
        {[70, 60, 70, 90, 90].map((w, i) => (
          <div key={i} className="h-9 rounded-lg bg-gray-100 animate-pulse" style={{ width: w }} />
        ))}
      </div>
      <div className="h-3.5 w-40 rounded bg-gray-200 animate-pulse -mt-2" />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 flex gap-6 animate-pulse">
          {[90, 80, 60, 60, 80, 90, 70].map((w, i) => (
            <div key={i} className="h-3 rounded bg-gray-200" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-6 px-4 py-3 border-b border-gray-100 animate-pulse">
            <div className="h-4 w-28 rounded bg-gray-200" />
            <div className="h-4 w-24 rounded bg-gray-100" />
            <div className="h-4 w-16 rounded bg-gray-100" />
            <div className="h-4 w-16 rounded bg-gray-100" />
            <div className="h-4 w-20 rounded bg-gray-100" />
            <div className="h-4 w-24 rounded bg-gray-100" />
            <div className="h-4 w-16 rounded bg-gray-100" />
          </div>
        ))}
      </div>

      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5 flex flex-col gap-3">
          <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
          <div className="h-36 w-full rounded-lg bg-gray-100 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
