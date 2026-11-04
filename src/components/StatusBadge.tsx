import type { AppointmentStatus } from "@prisma/client";

const styles: Record<AppointmentStatus, string> = {
  BOOKED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-200 text-gray-700",
  COMPLETED: "bg-blue-100 text-blue-800",
  NO_SHOW: "bg-amber-100 text-amber-800",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <span className={`badge ${styles[status]}`}>{status.replace("_", " ")}</span>;
}
