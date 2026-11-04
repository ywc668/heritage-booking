import { prisma } from "@/lib/db";
import { NewAppointmentForm } from "./NewAppointmentForm";

export default async function NewAppointment({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  const providers = await prisma.provider.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slotMinutes: true } });
  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-semibold">New appointment</h1>
      {providers.length === 0 ? <p className="text-muted">Add an optometrist first.</p> : <NewAppointmentForm providers={providers} defaultEmail={email ?? ""} />}
    </div>
  );
}
