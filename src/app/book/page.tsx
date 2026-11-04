import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { BookingFlow } from "./BookingFlow";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const [session, providers, settings] = await Promise.all([
    auth(),
    prisma.provider.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, title: true, slotMinutes: true },
    }),
    getSettings(),
  ]);
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Book an appointment</h1>
      {providers.length === 0 ? (
        <p className="text-muted">Online booking is not available right now. Please contact us directly.</p>
      ) : (
        <BookingFlow
          providers={providers}
          signedIn={Boolean(session?.user)}
          userPhone={session?.user ? (await prisma.user.findUnique({ where: { id: session.user.id }, select: { phone: true } }))?.phone ?? "" : ""}
          cancelCutoffHours={settings.cancelCutoffHours}
        />
      )}
    </div>
  );
}
