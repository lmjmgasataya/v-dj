"use client";

// import { useTransition } from "react";
// import { acknowledgeProfileCurrent } from "./actions";
import { useToast } from "@/components/toast/ToastProvider";
import { getProfileFreshness, FRESHNESS_BANNER_CLASS, FRESHNESS_MESSAGE } from "@/lib/vgLeaderStatus";

export function ProfileFreshnessBanner({
  updatedAt,
  isActive,
  profileCompleted,
}: {
  updatedAt: Date;
  isActive: boolean;
  profileCompleted: boolean;
}) {
  // const [pending, startTransition] = useTransition();
  const toast = useToast();
  const freshness = getProfileFreshness(updatedAt);
  const dateStr = updatedAt.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", timeZone: "Asia/Manila" });

  // function handleAcknowledge() {
  //   startTransition(async () => {
  //     await acknowledgeProfileCurrent();
  //     toast.show("Thanks! Your profile is marked current.", "success");
  //   });
  // }

  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-4 ${FRESHNESS_BANNER_CLASS[freshness]}`}>
      <div>
        <p className="text-sm font-semibold">Last updated {dateStr}</p>
        <p className="text-xs mt-0.5">{FRESHNESS_MESSAGE[freshness]}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {isActive ? "Actively Leading" : "Not Currently Leading"}
        </span>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
            profileCompleted ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {profileCompleted ? "Profile complete" : "Finish setting up your profile"}
        </span>
      </div>
      {/* <button
        onClick={handleAcknowledge}
        disabled={pending}
        className="shrink-0 bg-white border border-current text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-black/5 transition disabled:opacity-50"
      >
        {pending ? "Saving..." : "Yes, still correct"}
      </button> */}
    </div>
  );
}
