export function abbrev(name: string): string {
  return name
    .replace("Spiritual Foundations", "SF")
    .replace("Making Disciples", "MD")
    .replace(" - Victory Day", "");
}

export function shortSessionDate(sessionDate: string): string {
  return new Date(sessionDate + "T00:00:00").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
}
