import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { dateStrInTz, fmt, isValidDateStr, nextDateStr, startOfDayInTz } from "@/lib/time";
import { StatusBadge } from "@/components/StatusBadge";
import type { AppointmentStatus, Prisma } from "@prisma/client";

const STATUSES: AppointmentStatus[] = ["BOOKED", "CANCELLED", "COMPLETED", "NO_SHOW"];

export default async function AdminAppointments({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string; q?: string; range?: string; providerId?: string }>;
}) {
  const sp = await searchParams;
  const settings = await getSettings();
  const tz = settings.timezone;
  const range = sp.range ?? "upcoming";

  const where: Prisma.AppointmentWhereInput = {};
  if (sp.date && isValidDateStr(sp.date)) {
    where.startsAt = { gte: startOfDayInTz(sp.date, tz), lt: startOfDayInTz(nextDateStr(sp.date), tz) };
  } else if (range === "upcoming") {
    where.startsAt = { gte: startOfDayInTz(dateStrInTz(new Date(), tz), tz) };
  } else if (range === "past") {
    where.startsAt = { lt: new Date() };
  }
  if (sp.status && STATUSES.includes(sp.status as AppointmentStatus)) where.status = sp.status as AppointmentStatus;
  if (sp.providerId) where.providerId = sp.providerId;
  if (sp.q) where.user = { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { email: { contains: sp.q, mode: "insensitive" } }, { phone: { contains: sp.q } }] };

  const [appts, providers] = await Promise.all([
    prisma.appointment.findMany({ where, include: { user: true, provider: true }, orderBy: { startsAt: range === "past" ? "desc" : "asc" }, take: 300 }),
    prisma.provider.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Appointments</h1>
        <Link href="/admin/appointments/new" className="btn-primary">+ New appointment</Link>
      </div>
      <form className="card grid grid-cols-2 md:grid-cols-6 gap-2 items-end" method="get">
        <div><label className="label">Range</label>
          <select name="range" className="input" defaultValue={range}>
            <option value="upcoming">Upcoming</option><option value="past">Past</option><option value="all">All</option>
          </select></div>
        <div><label className="label">Date</label><input type="date" name="date" className="input" defaultValue={sp.date ?? ""} /></div>
        <div><label className="label">Status</label>
          <select name="status" className="input" defaultValue={sp.status ?? ""}>
            <option value="">Any</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select></div>
        <div><label className="label">Optometrist</label>
          <select name="providerId" className="input" defaultValue={sp.providerId ?? ""}>
            <option value="">Any</option>{providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select></div>
        <div><label className="label">Customer</label><input name="q" className="input" placeholder="name / email / phone" defaultValue={sp.q ?? ""} /></div>
        <div className="flex gap-2"><button className="btn-primary">Filter</button><Link href="/admin/appointments" className="btn-secondary">Reset</Link></div>
      </form>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-xs text-muted">
            <tr><th className="p-3">When</th><th className="p-3">Customer</th><th className="p-3">Optometrist</th><th className="p-3">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {appts.length === 0 && <tr><td colSpan={5} className="p-5 text-muted">No appointments match.</td></tr>}
            {appts.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="p-3 whitespace-nowrap">{fmt(a.startsAt, tz)}</td>
                <td className="p-3">{a.user.name || "—"}<div className="text-xs text-muted">{a.user.email}{a.user.phone ? ` · ${a.user.phone}` : ""}</div></td>
                <td className="p-3">{a.provider.name}</td>
                <td className="p-3"><StatusBadge status={a.status} /></td>
                <td className="p-3 text-right"><Link href={`/admin/appointments/${a.id}`} className="underline">Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
