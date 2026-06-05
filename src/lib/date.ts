const TZ = "Asia/Manila";

export function todayPH(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

export function currentYearPH(): number {
  return parseInt(todayPH().slice(0, 4), 10);
}
