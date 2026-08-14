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

export function checkInStatusTextClass(status: CheckInStatus): string {
  switch (status) {
    case "On-time":
      return "text-green-600";
    case "Late":
      return "text-orange-600";
    case "Absent":
      return "text-red-600";
  }
}

export function checkInStatusBgClass(status: CheckInStatus): string {
  switch (status) {
    case "On-time":
      return "bg-green-100";
    case "Late":
      return "bg-orange-100";
    case "Absent":
      return "bg-red-100";
  }
}
