export function toTitleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
