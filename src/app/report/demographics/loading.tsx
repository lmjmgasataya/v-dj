export default function DemographicsLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
        <div className="h-7 w-40 rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-44 rounded bg-gray-200 animate-pulse" />
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-5 flex flex-col gap-3">
          <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
          <div className="h-3 w-52 rounded bg-gray-200 animate-pulse" />
          <div className="h-52 w-full rounded-lg bg-gray-100 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
