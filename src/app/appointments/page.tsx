import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { fmt } from "@/lib/time";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert } from "@/components/Alert";
import { CancelButton } from "./CancelButton";
import { differenceInMinutes } from "date-fns";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ booked?: string; rescheduled?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/appointments");
  const { booked, rescheduled } = await searchParams;
  const [settings, appts] = await Promise.all([
    getSettings(),
    prisma.appointment.findMany({
      where: { userId: session.user.id },
      include: { provider: true },
      orderBy: { startsAt: "desc" },
    }),
  ]);
  const now = new Date();
  const tz = settings.timezone;
  const upcoming = appts.filter((a) => a.status === "BOOKED" && a.startsAt > now).sort((a, b) => +a.startsAt - +b.startsAt);
  const past = appts.filter((a) => !(a.status === "BOOKED" && a.startsAt > now));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My appointments</h1>
        <Link href="/book" className="btn-primary">Book another</Link>
      </div>
      {booked && <Alert kind="success">Your appointment is booked. We look forward to seeing you.</Alert>}
      {rescheduled && <Alert kind="success">Your appointment has been rescheduled.</Alert>}

      <section className="space-y-3">
        <h2 className="font-medium">Upcoming</h2>
        {upcoming.length === 0 && <p className="text-sm text-muted">No upcoming appointments.</p>}
        {upcoming.map((a) => {
          const canModify = differenceInMinutes(a.startsAt, now) >= settings.cancelCutoffHours * 60;
          return (
            <div key={a.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium">{fmt(a.startsAt, tz)}</div>
                <div className="text-sm text-muted">{a.provider.name} · {a.provider.slotMinutes} min</div>
                {a.notes && <div className="text-xs text-muted mt-1">Note: {a.notes}</div>}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={a.status} />
                {canModify ? (
                  <>
                    <Link href={`/appointments/${a.id}/reschedule`} className="btn-secondary">Reschedule</Link>
                    <CancelButton id={a.id} />
                  </>
                ) : (
                  <span className="text-xs text-muted max-w-[14rem]">
                    Changes within {settings.cancelCutoffHours}h of the appointment must be made by phone.
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium">Past &amp; cancelled</h2>
          {past.map((a) => (
            <div key={a.id} className="card flex items-center justify-between gap-3 opacity-80">
              <div>
                <div>{fmt(a.startsAt, tz)}</div>
                <div className="text-sm text-muted">{a.provider.name}</div>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
