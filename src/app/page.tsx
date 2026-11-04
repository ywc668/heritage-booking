import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const settings = await getSettings();
  const providers = await prisma.provider.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <div className="max-w-2xl mx-auto text-center py-16 space-y-6">
      <p className="text-xs uppercase tracking-[0.3em] text-muted">{settings.businessName}</p>
      <h1 className="text-4xl font-semibold">Book your eye exam</h1>
      <p className="text-muted">
        Choose a time that suits you. Appointments take {providers[0]?.slotMinutes ?? 20} minutes.
        You can reschedule or cancel online up to {settings.cancelCutoffHours} hours before your visit.
      </p>
      <div className="flex justify-center gap-3">
        <Link href="/book" className="btn-primary text-base !px-6 !py-3">Book an appointment</Link>
        <Link href="/appointments" className="btn-secondary text-base !px-6 !py-3">Manage my booking</Link>
      </div>
    </div>
  );
}
