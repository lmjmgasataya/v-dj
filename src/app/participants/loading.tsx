export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="h-3.5 w-40 rounded bg-gray-200 animate-pulse mb-2" />
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="h-7 w-36 rounded bg-gray-200 animate-pulse" />
            <div className="h-3.5 w-20 rounded bg-gray-100 animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-7 w-28 rounded-lg bg-gray-200 animate-pulse" />
            <div className="h-3.5 w-20 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 h-10 rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-10 w-20 rounded-lg bg-indigo-200 animate-pulse" />
      </div>

      <div className="flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-200 shadow-sm bg-white overflow-hidden">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 animate-pulse">
            <div className="flex flex-col gap-1.5">
              <div className="h-4 w-48 rounded bg-gray-200" />
              <div className="h-3 w-36 rounded bg-gray-100" />
            </div>
            <div className="h-4 w-4 rounded bg-gray-100 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
