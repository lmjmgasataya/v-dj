export function isValidPin(s: string): boolean {
  return /^\d{5}$/.test(s);
}
