import { ParticipantListSkeleton } from "./ParticipantList";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="h-3.5 w-40 rounded bg-gray-200 animate-pulse mb-2" />
        <div className="flex items-center justify-between">
          <div className="h-7 w-36 rounded bg-gray-200 animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-7 w-28 rounded-lg bg-gray-200 animate-pulse" />
            <div className="h-3.5 w-20 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 h-10 rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-10 w-20 rounded-lg bg-indigo-200 animate-pulse" />
      </div>

      <ParticipantListSkeleton />
    </div>
  );
}
