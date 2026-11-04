import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { fmt } from "@/lib/time";
import { Alert } from "@/components/Alert";
import { RescheduleFlow } from "./RescheduleFlow";
import { differenceInMinutes } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ReschedulePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;
  if (!session?.user) redirect(`/login?callbackUrl=/appointments/${id}/reschedule`);
  const appt = await prisma.appointment.findUnique({ where: { id }, include: { provider: true } });
  if (!appt || appt.userId !== session.user.id) notFound();
  const settings = await getSettings();
  const canModify = appt.status === "BOOKED" && differenceInMinutes(appt.startsAt, new Date()) >= settings.cancelCutoffHours * 60;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Reschedule</h1>
      <p className="text-sm">
        Current time: <span className="font-medium">{fmt(appt.startsAt, settings.timezone)}</span> with {appt.provider.name}
      </p>
      {!canModify ? (
        <Alert>
          This appointment can no longer be rescheduled online (changes must be made at least {settings.cancelCutoffHours} hours in advance).
          Please call us. <Link href="/appointments" className="underline">Back</Link>
        </Alert>
      ) : (
        <RescheduleFlow id={appt.id} providerId={appt.providerId} />
      )}
    </div>
  );
}
