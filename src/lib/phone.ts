export const MOBILE_NUMBER_PATTERN = String.raw`(09\d{9})|(\+639\d{9})|(639\d{9})`;
export const MOBILE_NUMBER_REGEX = /^(09\d{9}|\+639\d{9}|639\d{9})$/;
export const MOBILE_NUMBER_HELP = "Enter a valid mobile number: 09XXXXXXXXX, 639XXXXXXXXX, or +639XXXXXXXXX.";

export function normalizePhoneToE164(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("639")) return `+${d}`;
  if (d.length === 11 && d.startsWith("09")) return `+63${d.slice(1)}`;
  if (d.length === 10 && d.startsWith("9")) return `+63${d}`;
  return null;
}
