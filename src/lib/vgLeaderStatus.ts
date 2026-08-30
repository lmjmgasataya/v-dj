export type ProfileFreshness = "fresh" | "stale" | "overdue";

const STALE_AFTER_DAYS = 30;
const OVERDUE_AFTER_DAYS = 60;

export function getProfileFreshness(updatedAt: Date, now: Date = new Date()): ProfileFreshness {
  const days = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (days >= OVERDUE_AFTER_DAYS) return "overdue";
  if (days >= STALE_AFTER_DAYS) return "stale";
  return "fresh";
}

export const FRESHNESS_BADGE_CLASS: Record<ProfileFreshness, string> = {
  fresh: "bg-green-100 text-green-700",
  stale: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
};

export const FRESHNESS_BANNER_CLASS: Record<ProfileFreshness, string> = {
  fresh: "bg-green-50 border-green-200 text-green-700",
  stale: "bg-amber-50 border-amber-200 text-amber-700",
  overdue: "bg-red-50 border-red-200 text-red-700",
};

export const FRESHNESS_MESSAGE: Record<ProfileFreshness, string> = {
  fresh: "Your profile is up to date.",
  stale: "It's been about a month — please confirm your info is still current.",
  overdue: "This hasn't been confirmed in over 2 months.",
};
