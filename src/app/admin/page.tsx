import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { dateStrInTz, fmt, nextDateStr, startOfDayInTz } from "@/lib/time";
import { StatusBadge } from "@/components/StatusBadge";
import { addDays } from "date-fns";

export default async function AdminHome() {
  const settings = await getSettings();
  const tz = settings.timezone;
  const now = new Date();
  const todayStr = dateStrInTz(now, tz);
  const dayStart = startOfDayInTz(todayStr, tz);
  const dayEnd = startOfDayInTz(nextDateStr(todayStr), tz);

  const [today, upcomingCount, weekCount, providers] = await Promise.all([
    prisma.appointment.findMany({
      where: { startsAt: { gte: dayStart, lt: dayEnd } },
      include: { user: true, provider: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.appointment.count({ where: { status: "BOOKED", startsAt: { gte: now } } }),
    prisma.appointment.count({ where: { status: "BOOKED", startsAt: { gte: now, lt: addDays(now, 7) } } }),
    prisma.provider.count({ where: { active: true } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Today · {fmt(now, tz, "EEEE d MMMM")}</h1>
        <Link href="/admin/appointments/new" className="btn-primary">+ New appointment</Link>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="card"><div className="text-xs text-muted">Today</div><div className="text-2xl font-semibold">{today.filter((a) => a.status === "BOOKED").length}</div></div>
        <div className="card"><div className="text-xs text-muted">Next 7 days</div><div className="text-2xl font-semibold">{weekCount}</div></div>
        <div className="card"><div className="text-xs text-muted">All upcoming · {providers} optometrist{providers === 1 ? "" : "s"}</div><div className="text-2xl font-semibold">{upcomingCount}</div></div>
      </div>
      <div className="card p-0 overflow-hidden">
        {today.length === 0 ? (
          <p className="p-5 text-sm text-muted">No appointments today.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-xs text-muted">
              <tr><th className="p-3">Time</th><th className="p-3">Customer</th><th className="p-3">Optometrist</th><th className="p-3">Status</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {today.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="p-3 font-medium whitespace-nowrap">{fmt(a.startsAt, tz, "h:mm a")}</td>
                  <td className="p-3">{a.user.name || a.user.email}<div className="text-xs text-muted">{a.user.phone}</div></td>
                  <td className="p-3">{a.provider.name}</td>
                  <td className="p-3"><StatusBadge status={a.status} /></td>
                  <td className="p-3 text-right"><Link href={`/admin/appointments/${a.id}`} className="underline">Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
