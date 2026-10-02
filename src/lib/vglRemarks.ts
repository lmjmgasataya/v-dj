// Remarks for the "Profile Not Yet Completed" report. Kept free of server imports so the
// client table can use them for colors.

export const REMARK = {
  byLgl: "Identified by Leadership Group Leader",
  byParticipant: "Identified by Discipleship Journey Participant",
  claimedIncomplete: "Claimed profile but incomplete",
  manualIncomplete: (quarterLabel: string) => `Found in ${quarterLabel} database but incomplete`,
  manualMissing: (quarterLabel: string) => `Found in ${quarterLabel} database but missing`,
};

export type RemarkKind = "byLgl" | "byParticipant" | "claimedIncomplete" | "manualIncomplete" | "manualMissing";

/** Display order of the remark kinds. */
export const REMARK_KIND_ORDER: RemarkKind[] = [
  "byLgl",
  "byParticipant",
  "claimedIncomplete",
  "manualIncomplete",
  "manualMissing",
];

export function remarkKind(remark: string): RemarkKind {
  if (remark === REMARK.byLgl) return "byLgl";
  if (remark === REMARK.byParticipant) return "byParticipant";
  if (remark === REMARK.claimedIncomplete) return "claimedIncomplete";
  return remark.endsWith("incomplete") ? "manualIncomplete" : "manualMissing";
}
