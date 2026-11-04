import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { fmt } from "@/lib/time";
import { StatusBadge } from "@/components/StatusBadge";
import { AppointmentEditor } from "./AppointmentEditor";

export default async function AdminAppointmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [appt, settings, providers] = await Promise.all([
    prisma.appointment.findUnique({ where: { id }, include: { user: true, provider: true } }),
    getSettings(),
    prisma.provider.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slotMinutes: true } }),
  ]);
  if (!appt) notFound();
  const tz = settings.timezone;
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Appointment</h1>
        <Link href="/admin/appointments" className="btn-secondary">Back</Link>
      </div>
      <div className="card grid md:grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs text-muted">When</div>
          <div className="font-medium">{fmt(appt.startsAt, tz)} – {fmt(appt.endsAt, tz, "h:mm a")}</div>
          <div className="text-muted">{appt.provider.name} · {appt.provider.slotMinutes} min</div>
          <div className="mt-2"><StatusBadge status={appt.status} /></div>
        </div>
        <div>
          <div className="text-xs text-muted">Customer</div>
          <div className="font-medium">{appt.user.name || "—"}</div>
          <div>{appt.user.email}</div>
          <div>{appt.user.phone || "No phone"}</div>
          <div className="text-xs text-muted mt-1">Booked {fmt(appt.createdAt, tz)}{appt.cancelledAt ? ` · cancelled by ${appt.cancelledBy} ${fmt(appt.cancelledAt, tz)}` : ""}</div>
        </div>
      </div>
      <AppointmentEditor
        appt={{ id: appt.id, providerId: appt.providerId, status: appt.status, notes: appt.notes ?? "", adminNotes: appt.adminNotes ?? "" }}
        providers={providers}
      />
    </div>
  );
}
