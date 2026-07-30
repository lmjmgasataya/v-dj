import { TablesResultsSkeleton } from "./TablesResultsSkeleton";

export default function TableAssignmentsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="h-3 w-10 rounded bg-gray-200 animate-pulse" />
        <div className="h-10 w-48 rounded-lg bg-gray-200 animate-pulse" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="h-3 w-16 rounded bg-gray-200 animate-pulse" />
        <div className="h-10 w-72 rounded-lg bg-gray-200 animate-pulse" />
      </div>

      <TablesResultsSkeleton />
    </div>
  );
}
