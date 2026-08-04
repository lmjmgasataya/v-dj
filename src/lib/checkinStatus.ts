import type { CheckInStatus } from "@/db/schema";

export function checkInStatusBadgeClass(status: CheckInStatus): string {
  switch (status) {
    case "On-time":
      return "bg-green-100 text-green-700";
    case "Late":
      return "bg-orange-100 text-orange-700";
    case "Absent":
      return "bg-red-100 text-red-700";
  }
}
