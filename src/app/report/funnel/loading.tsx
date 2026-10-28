import { FunnelResultsSkeleton } from "./FunnelResultsSkeleton";

export default function FunnelLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <div className="h-4 w-48 rounded bg-gray-200 animate-pulse" />
        <div className="h-7 w-52 rounded bg-gray-200 animate-pulse" />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="h-9 w-48 rounded-lg bg-gray-200 animate-pulse" />
        <div className="h-9 w-44 rounded-lg bg-gray-200 animate-pulse" />
        <div className="h-9 w-48 rounded-lg bg-gray-200 animate-pulse" />
      </div>

      <FunnelResultsSkeleton />
    </div>
  );
}
