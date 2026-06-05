export default function CheckInsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
        <div className="h-7 w-44 rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-56 rounded bg-gray-200 animate-pulse" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="h-3 w-16 rounded bg-gray-200 animate-pulse" />
        <div className="h-10 w-72 rounded-lg bg-gray-200 animate-pulse" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex flex-col gap-2">
            <div className="h-3 w-24 rounded bg-gray-200 animate-pulse" />
            <div className="h-7 w-20 rounded bg-gray-200 animate-pulse" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5 flex flex-col gap-4">
        <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
        <div className="h-64 w-full rounded-lg bg-gray-100 animate-pulse" />
      </div>
    </div>
  );
}
