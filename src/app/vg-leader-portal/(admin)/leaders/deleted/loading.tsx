export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="h-3.5 w-56 rounded bg-gray-200 animate-pulse mb-2" />
        <div className="h-7 w-48 rounded bg-gray-200 animate-pulse" />
        <div className="h-3.5 w-20 rounded bg-gray-100 animate-pulse mt-1" />
      </div>

      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4 animate-pulse">
            <div className="flex flex-col gap-1.5">
              <div className="h-4 w-44 rounded bg-gray-200" />
              <div className="h-3.5 w-36 rounded bg-gray-100" />
              <div className="h-3 w-28 rounded bg-red-100" />
            </div>
            <div className="h-8 w-20 rounded-lg bg-gray-100 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
