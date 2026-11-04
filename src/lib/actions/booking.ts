"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { isSlotAvailable } from "@/lib/availability";
import { addMinutes, differenceInMinutes } from "date-fns";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const bookSchema = z.object({
  providerId: z.string().min(1),
  startsAt: z.string().datetime(),
  notes: z.string().max(500).optional(),
  phone: z.string().max(40).optional(),
});

/** Customer books a slot. */
export async function bookAppointment(input: z.infer<typeof bookSchema>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid booking details." };
  const { providerId, notes, phone } = parsed.data;
  const startsAt = new Date(parsed.data.startsAt);

  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider || !provider.active) return { ok: false, error: "This optometrist is not available." };

  if (!(await isSlotAvailable({ providerId, startsAt })))
    return { ok: false, error: "Sorry, that time was just taken. Please pick another slot." };

  const endsAt = addMinutes(startsAt, provider.slotMinutes);
  try {
    const appt = await prisma.$transaction(async (tx) => {
      const clash = await tx.appointment.count({
        where: { providerId, status: "BOOKED", startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
      });
      if (clash > 0) throw new Error("CLASH");
      if (phone) await tx.user.update({ where: { id: user.id }, data: { phone } });
      return tx.appointment.create({
        data: { userId: user.id, providerId, startsAt, endsAt, notes: notes || null },
      });
    });
    revalidatePath("/appointments");
    revalidatePath("/admin");
    return { ok: true, id: appt.id };
  } catch (e) {
    if (e instanceof Error && e.message === "CLASH")
      return { ok: false, error: "Sorry, that time was just taken. Please pick another slot." };
    throw e;
  }
}

async function loadOwnAppointment(id: string, userId: string) {
  const appt = await prisma.appointment.findUnique({ where: { id }, include: { provider: true } });
  if (!appt || appt.userId !== userId) return null;
  return appt;
}

/** True if the customer is still allowed to change this appointment (cutoff rule). */
export async function canCustomerModify(startsAt: Date, now = new Date()) {
  const settings = await getSettings();
  return differenceInMinutes(startsAt, now) >= settings.cancelCutoffHours * 60;
}

export async function cancelAppointment(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const appt = await loadOwnAppointment(id, user.id);
  if (!appt) return { ok: false, error: "Appointment not found." };
  if (appt.status !== "BOOKED") return { ok: false, error: "This appointment is no longer active." };
  if (!(await canCustomerModify(appt.startsAt))) {
    const s = await getSettings();
    return { ok: false, error: `Appointments can only be cancelled at least ${s.cancelCutoffHours} hours in advance. Please call us.` };
  }
  await prisma.appointment.update({
    where: { id },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelledBy: "customer" },
  });
  revalidatePath("/appointments");
  revalidatePath("/admin");
  return { ok: true };
}

export async function rescheduleAppointment(id: string, newStartsAtIso: string): Promise<ActionResult> {
  const user = await requireUser();
  const appt = await loadOwnAppointment(id, user.id);
  if (!appt) return { ok: false, error: "Appointment not found." };
  if (appt.status !== "BOOKED") return { ok: false, error: "This appointment is no longer active." };
  if (!(await canCustomerModify(appt.startsAt))) {
    const s = await getSettings();
    return { ok: false, error: `Appointments can only be rescheduled at least ${s.cancelCutoffHours} hours in advance. Please call us.` };
  }
  const parsed = z.string().datetime().safeParse(newStartsAtIso);
  if (!parsed.success) return { ok: false, error: "Invalid time." };
  const startsAt = new Date(parsed.data);
  if (!(await isSlotAvailable({ providerId: appt.providerId, startsAt, ignoreAppointmentId: id })))
    return { ok: false, error: "That time is no longer available. Please pick another slot." };
  const endsAt = addMinutes(startsAt, appt.provider.slotMinutes);
  await prisma.appointment.update({ where: { id }, data: { startsAt, endsAt } });
  revalidatePath("/appointments");
  revalidatePath("/admin");
  return { ok: true, id };
}
