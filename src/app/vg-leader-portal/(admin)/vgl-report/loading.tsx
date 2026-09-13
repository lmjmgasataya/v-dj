export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-3.5 w-64 rounded bg-gray-200 animate-pulse -mt-2" />

      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5 flex flex-col gap-3">
          <div className="h-4 w-40 rounded bg-gray-200 animate-pulse" />
          <div className="h-40 w-full rounded-lg bg-gray-100 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
