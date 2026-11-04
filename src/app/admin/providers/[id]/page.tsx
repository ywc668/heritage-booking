import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { fmt } from "@/lib/time";
import { ProviderForm } from "@/components/ProviderForm";
import { WorkingHoursForm } from "./WorkingHoursForm";
import { TimeOffForm } from "./TimeOffForm";
import { addTimeOff, deleteProvider, deleteTimeOff, updateProvider } from "@/lib/actions/admin";

export default async function EditProvider({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [provider, settings] = await Promise.all([
    prisma.provider.findUnique({ where: { id }, include: { workingHours: true, timeOff: { where: { endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } } } }),
    getSettings(),
  ]);
  if (!provider) notFound();
  const hours = Array.from({ length: 7 }, (_, weekday) => {
    const h = provider.workingHours.find((w) => w.weekday === weekday);
    return { weekday, enabled: h?.enabled ?? false, startMinutes: h?.startMinutes ?? 540, endMinutes: h?.endMinutes ?? 1080 };
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{provider.name}</h1>
        <Link href="/admin/providers" className="btn-secondary">Back</Link>
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">Details</h2>
        <ProviderForm
          action={updateProvider.bind(null, provider.id)}
          initial={{ name: provider.name, title: provider.title, email: provider.email ?? "", slotMinutes: provider.slotMinutes, bufferMinutes: provider.bufferMinutes, active: provider.active }}
          submitLabel="Save details"
        />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Weekly working hours</h2>
        <p className="text-xs text-muted">Times are in {settings.timezone}. Changing hours does not cancel existing bookings outside the new hours.</p>
        <WorkingHoursForm providerId={provider.id} hours={hours} />
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Time off / holidays</h2>
        <TimeOffForm action={addTimeOff.bind(null, provider.id)} />
        {provider.timeOff.length > 0 && (
          <ul className="card divide-y divide-border p-0">
            {provider.timeOff.map((t) => (
              <li key={t.id} className="flex items-center justify-between p-3 text-sm">
                <span>{fmt(t.startsAt, settings.timezone)} → {fmt(t.endsAt, settings.timezone)}{t.reason ? ` · ${t.reason}` : ""}</span>
                <form action={deleteTimeOff.bind(null, t.id)}><button className="btn-danger !py-1">Remove</button></form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card border-red-200 space-y-2">
        <h2 className="font-medium text-red-800">Remove optometrist</h2>
        <p className="text-xs text-muted">If they have upcoming bookings they are deactivated instead of deleted, so history is kept.</p>
        <form action={deleteProvider.bind(null, provider.id)}><button className="btn-danger">Remove {provider.name}</button></form>
      </section>
    </div>
  );
}
