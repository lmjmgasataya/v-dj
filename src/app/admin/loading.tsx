export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="h-3.5 w-32 rounded bg-gray-200 animate-pulse mb-2" />
        <div className="h-7 w-48 rounded bg-gray-200 animate-pulse" />
      </div>

      <div className="px-4 py-3 rounded-xl border border-indigo-100 bg-indigo-50 w-fit flex flex-col gap-2">
        <div className="h-8 w-36 rounded bg-indigo-200 animate-pulse" />
        <div className="flex flex-col gap-1.5 pl-3 border-l-2 border-indigo-200">
          <div className="h-3.5 w-44 rounded bg-indigo-200 animate-pulse" />
          <div className="h-3.5 w-36 rounded bg-indigo-200 animate-pulse" />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-indigo-200 animate-pulse shrink-0" />
          <div className="h-4 w-28 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 w-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
        <div className="h-10 w-full rounded-lg bg-gray-100 animate-pulse" />
      </div>
    </div>
  );
}
