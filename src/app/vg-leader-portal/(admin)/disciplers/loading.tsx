export default function Loading() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
        <div className="h-3.5 w-6 rounded bg-gray-100 animate-pulse" />
      </div>
      <div className="flex flex-wrap gap-2 px-6 pt-4">
        <div className="flex-1 min-w-48 h-9 rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-9 w-36 rounded-lg bg-gray-100 animate-pulse" />
      </div>
      <div className="px-6 pt-4 pb-2">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 flex gap-6 animate-pulse rounded-t-lg">
          {[100, 80, 90, 70, 90, 90].map((w, i) => (
            <div key={i} className="h-3 rounded bg-gray-200" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-6 px-4 py-3 border-b border-gray-100 animate-pulse">
            <div className="h-4 w-32 rounded bg-gray-200" />
            <div className="h-4 w-24 rounded bg-gray-100" />
            <div className="h-5 w-20 rounded-full bg-gray-100" />
            <div className="h-5 w-20 rounded-full bg-gray-100" />
            <div className="h-4 w-10 rounded bg-gray-100" />
            <div className="h-4 w-20 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
