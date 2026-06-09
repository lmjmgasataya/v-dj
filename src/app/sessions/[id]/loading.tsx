export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 w-48 rounded bg-gray-200 animate-pulse" />
          <div className="h-7 w-40 rounded bg-gray-200 animate-pulse" />
          <div className="h-3.5 w-36 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="h-9 w-12 rounded bg-indigo-200 animate-pulse" />
          <div className="h-3.5 w-16 rounded bg-gray-100 animate-pulse" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex items-start justify-between px-5 py-3 rounded-xl border border-gray-200 bg-white animate-pulse">
            <div className="flex items-start gap-3">
              <div className="h-3.5 w-4 rounded bg-gray-100 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1.5">
                <div className="h-4 w-44 rounded bg-gray-200" />
                <div className="h-3 w-28 rounded bg-gray-100" />
              </div>
            </div>
            <div className="h-3.5 w-12 rounded bg-gray-100 shrink-0 ml-3 mt-0.5" />
          </div>
        ))}
      </div>
    </div>
  );
}
