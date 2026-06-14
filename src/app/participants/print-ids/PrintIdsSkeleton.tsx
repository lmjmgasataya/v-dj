export function PrintIdsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-1.5 animate-pulse">
          <div className="h-3 w-10 rounded bg-gray-200" />
          <div className="h-3 w-2 rounded bg-gray-100" />
          <div className="h-3 w-20 rounded bg-gray-200" />
          <div className="h-3 w-2 rounded bg-gray-100" />
          <div className="h-3 w-16 rounded bg-gray-200" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-2 animate-pulse">
            <div className="h-7 w-28 rounded bg-gray-200" />
            <div className="h-4 w-44 rounded bg-gray-100" />
          </div>
          <div className="h-9 w-20 rounded-lg bg-gray-200 animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col border border-gray-200 rounded-xl overflow-hidden animate-pulse"
          >
            <div className="h-14 bg-gray-200" />
            <div className="flex flex-col flex-1 p-4 min-h-52">
              <div className="flex-1 flex items-center justify-center">
                <div className="h-8 w-40 rounded bg-gray-200" />
              </div>
              <div className="flex justify-end">
                <div className="w-24 h-24 rounded-md bg-gray-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
