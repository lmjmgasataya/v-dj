export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="h-3.5 w-32 rounded bg-gray-200 animate-pulse mb-2" />
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="h-7 w-40 rounded bg-gray-200 animate-pulse" />
            <div className="h-3.5 w-24 rounded bg-gray-100 animate-pulse" />
          </div>
          <div className="h-9 w-28 rounded-lg bg-indigo-200 animate-pulse" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-8 w-16 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm animate-pulse">
            <div className="flex flex-col gap-1.5">
              <div className="h-4 w-48 rounded bg-gray-200" />
              <div className="h-3.5 w-36 rounded bg-gray-100" />
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <div className="flex flex-col items-end gap-1">
                <div className="h-7 w-10 rounded bg-indigo-200" />
                <div className="h-3 w-16 rounded bg-gray-100" />
              </div>
              <div className="h-4 w-2 rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
