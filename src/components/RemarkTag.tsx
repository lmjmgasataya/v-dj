import { remarkKind, type RemarkKind } from "@/lib/vglRemarks";

// Very light tints so several tags in one row stay easy on the eye. `chipActive` is the
// selected filter chip — one step stronger plus a ring, same hue.
export const REMARK_STYLE: Record<RemarkKind, { tag: string; chipActive: string }> = {
  byLgl: {
    tag: "bg-sky-50 text-sky-700 border-sky-100",
    chipActive: "bg-sky-100 text-sky-800 ring-1 ring-sky-300",
  },
  byParticipant: {
    tag: "bg-violet-50 text-violet-700 border-violet-100",
    chipActive: "bg-violet-100 text-violet-800 ring-1 ring-violet-300",
  },
  claimedIncomplete: {
    tag: "bg-amber-50 text-amber-700 border-amber-100",
    chipActive: "bg-amber-100 text-amber-800 ring-1 ring-amber-300",
  },
  manualIncomplete: {
    tag: "bg-emerald-50 text-emerald-700 border-emerald-100",
    chipActive: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300",
  },
  manualMissing: {
    tag: "bg-rose-50 text-rose-700 border-rose-100",
    chipActive: "bg-rose-100 text-rose-800 ring-1 ring-rose-300",
  },
};

/** One "Profile Not Yet Completed" remark as a colored tag (see REMARK in vglRemarks). */
export function RemarkTag({ remark }: { remark: string }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${REMARK_STYLE[remarkKind(remark)].tag}`}
    >
      {remark}
    </span>
  );
}
