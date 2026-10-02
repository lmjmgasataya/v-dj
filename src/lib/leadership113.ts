export const LEADERSHIP_113_STATUSES = ["yes", "no", "ongoing"] as const;

export type Leadership113Status = (typeof LEADERSHIP_113_STATUSES)[number];

export const LEADERSHIP_113_LABEL: Record<Leadership113Status, string> = {
  yes: "Yes",
  no: "No",
  ongoing: "Ongoing",
};

/** Form value -> column value; anything unrecognized (incl. "") is stored as not set. */
export function parseLeadership113(value: FormDataEntryValue | null): Leadership113Status | null {
  return LEADERSHIP_113_STATUSES.includes(value as Leadership113Status) ? (value as Leadership113Status) : null;
}

export function leadership113Label(value: string | null | undefined): string | null {
  return value && value in LEADERSHIP_113_LABEL ? LEADERSHIP_113_LABEL[value as Leadership113Status] : null;
}
