export default function RemittanceLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="h-7 w-52 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-44 rounded bg-gray-200 animate-pulse" />
          </div>
          <div className="h-8 w-28 rounded-lg bg-gray-200 animate-pulse shrink-0" />
        </div>
      </div>

      <div className="h-10 w-52 rounded-lg bg-gray-200 animate-pulse" />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex gap-6">
          <div className="h-4 w-6 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center gap-6 px-4 py-3 border-b border-gray-100 ${
              i % 2 === 0 ? "bg-white" : "bg-gray-50"
            }`}
          >
            <div className="h-4 w-6 rounded bg-gray-200 animate-pulse shrink-0" />
            <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
            <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
          </div>
        ))}
        <div className="bg-gray-50 border-t-2 border-gray-200 px-4 py-3 flex justify-end gap-6">
          <div className="h-4 w-10 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-8 rounded bg-gray-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
