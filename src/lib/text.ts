export function toTitleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function firstWord(s: string | null | undefined): string {
  return (s ?? "").trim().split(/\s+/)[0] ?? "";
}
