"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isSlotAvailable } from "@/lib/availability";
import { hhmmToMinutes } from "@/lib/time";
import { addMinutes } from "date-fns";
import type { ActionResult } from "@/lib/actions/booking";

export type FormState = { error?: string; success?: string } | undefined;

function revalidateAdmin() {
  revalidatePath("/admin", "layout");
  revalidatePath("/appointments");
  revalidatePath("/book");
}

// ---------- Settings ----------
export async function updateSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const schema = z.object({
    businessName: z.string().min(1).max(80),
    timezone: z.string().min(1),
    cancelCutoffHours: z.coerce.number().int().min(0).max(24 * 30),
    bookingWindowDays: z.coerce.number().int().min(1).max(365),
    minNoticeMinutes: z.coerce.number().int().min(0).max(60 * 24 * 7),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  try {
    new Intl.DateTimeFormat("en", { timeZone: parsed.data.timezone });
  } catch {
    return { error: "Unknown timezone. Use an IANA name such as America/Toronto or America/Vancouver." };
  }
  await prisma.settings.update({ where: { id: 1 }, data: parsed.data });
  revalidateAdmin();
  return { success: "Settings saved." };
}

// ---------- Providers ----------
const providerSchema = z.object({
  name: z.string().min(1).max(80),
  title: z.string().max(80).optional().default("Optometrist"),
  email: z.string().email().optional().or(z.literal("")),
  slotMinutes: z.coerce.number().int().min(5).max(240),
  bufferMinutes: z.coerce.number().int().min(0).max(120),
  active: z.coerce.boolean().optional().default(false),
});

export async function createProvider(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = providerSchema.safeParse({ ...Object.fromEntries(formData), active: formData.get("active") === "on" });
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const { email, ...rest } = parsed.data;
  const provider = await prisma.provider.create({
    data: {
      ...rest,
      email: email || null,
      // Default schedule for a new optometrist: Mon–Fri 09:00–18:00, Sat 09:00–17:00, closed Sunday
      workingHours: {
        create: Array.from({ length: 7 }, (_, weekday) => ({ weekday, startMinutes: 540, endMinutes: weekday === 6 ? 1020 : 1080, enabled: weekday !== 0 })),
      },
    },
  });
  revalidateAdmin();
  redirect(`/admin/providers/${provider.id}`);
}

export async function updateProvider(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = providerSchema.safeParse({ ...Object.fromEntries(formData), active: formData.get("active") === "on" });
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const { email, ...rest } = parsed.data;
  await prisma.provider.update({ where: { id }, data: { ...rest, email: email || null } });
  revalidateAdmin();
  return { success: "Saved." };
}

/** Save all 7 weekday rows at once. Form fields: enabled-0..6, start-0..6, end-0..6 */
export async function updateWorkingHours(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const rows: { weekday: number; enabled: boolean; startMinutes: number; endMinutes: number }[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    const enabled = formData.get(`enabled-${weekday}`) === "on";
    try {
      const startMinutes = hhmmToMinutes(String(formData.get(`start-${weekday}`) || "09:00"));
      const endMinutes = hhmmToMinutes(String(formData.get(`end-${weekday}`) || "18:00"));
      if (enabled && endMinutes <= startMinutes) return { error: `End time must be after start time (${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][weekday]}).` };
      rows.push({ weekday, enabled, startMinutes, endMinutes });
    } catch {
      return { error: "Invalid time format." };
    }
  }
  await prisma.$transaction(
    rows.map((r) =>
      prisma.workingHours.upsert({
        where: { providerId_weekday: { providerId: id, weekday: r.weekday } },
        update: r,
        create: { providerId: id, ...r },
      }),
    ),
  );
  revalidateAdmin();
  return { success: "Working hours saved." };
}

export async function deleteProvider(id: string): Promise<void> {
  await requireAdmin();
  const upcoming = await prisma.appointment.count({ where: { providerId: id, status: "BOOKED", startsAt: { gt: new Date() } } });
  if (upcoming > 0) {
    // Keep history intact: deactivate instead of deleting when future bookings exist.
    await prisma.provider.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.provider.delete({ where: { id } });
  }
  revalidateAdmin();
  redirect("/admin/providers");
}

export async function addTimeOff(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { fromZonedTime } = await import("date-fns-tz");
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const tz = settings?.timezone ?? "UTC";
  const start = String(formData.get("start") || "");
  const end = String(formData.get("end") || "");
  const reason = String(formData.get("reason") || "").slice(0, 200);
  if (!start || !end) return { error: "Start and end are required." };
  const startsAt = fromZonedTime(start, tz);
  const endsAt = fromZonedTime(end, tz);
  if (!(endsAt > startsAt)) return { error: "End must be after start." };
  await prisma.timeOff.create({ data: { providerId: id, startsAt, endsAt, reason: reason || null } });
  revalidateAdmin();
  return { success: "Time off added." };
}

export async function deleteTimeOff(id: string): Promise<void> {
  await requireAdmin();
  await prisma.timeOff.delete({ where: { id } });
  revalidateAdmin();
}

// ---------- Appointments ----------
const adminBookSchema = z.object({
  providerId: z.string().min(1),
  startsAt: z.string().datetime(),
  email: z.string().email(),
  name: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  notes: z.string().max(500).optional(),
});

/** Admin books on behalf of a customer (walk-in / phone). Creates the customer record if needed. */
export async function adminCreateAppointment(input: z.infer<typeof adminBookSchema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = adminBookSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  const { providerId, email, name, phone, notes } = parsed.data;
  const startsAt = new Date(parsed.data.startsAt);
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) return { ok: false, error: "Provider not found." };
  if (!(await isSlotAvailable({ providerId, startsAt, forAdmin: true })))
    return { ok: false, error: "That slot is not available." };
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { ...(name ? { name } : {}), ...(phone ? { phone } : {}) },
    create: { email: email.toLowerCase(), name: name || null, phone: phone || null },
  });
  const appt = await prisma.appointment.create({
    data: { userId: user.id, providerId, startsAt, endsAt: addMinutes(startsAt, provider.slotMinutes), notes: notes || null },
  });
  revalidateAdmin();
  return { ok: true, id: appt.id };
}

export async function adminRescheduleAppointment(id: string, providerId: string, newStartsAtIso: string): Promise<ActionResult> {
  await requireAdmin();
  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt) return { ok: false, error: "Appointment not found." };
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) return { ok: false, error: "Provider not found." };
  const startsAt = new Date(newStartsAtIso);
  if (Number.isNaN(startsAt.getTime())) return { ok: false, error: "Invalid time." };
  if (!(await isSlotAvailable({ providerId, startsAt, forAdmin: true, ignoreAppointmentId: id })))
    return { ok: false, error: "That slot is not available." };
  await prisma.appointment.update({
    where: { id },
    data: { providerId, startsAt, endsAt: addMinutes(startsAt, provider.slotMinutes), status: "BOOKED", cancelledAt: null, cancelledBy: null },
  });
  revalidateAdmin();
  return { ok: true, id };
}

export async function adminUpdateAppointment(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const schema = z.object({
    status: z.enum(["BOOKED", "CANCELLED", "COMPLETED", "NO_SHOW"]),
    adminNotes: z.string().max(1000).optional(),
    notes: z.string().max(500).optional(),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid input." };
  const current = await prisma.appointment.findUnique({ where: { id } });
  if (!current) return { error: "Not found." };
  const { status, adminNotes, notes } = parsed.data;
  if (status === "BOOKED" && current.status !== "BOOKED") {
    // Re-activating: make sure the slot is still free.
    if (!(await isSlotAvailable({ providerId: current.providerId, startsAt: current.startsAt, forAdmin: true, ignoreAppointmentId: id })))
      return { error: "Cannot re-activate: that slot is now taken." };
  }
  await prisma.appointment.update({
    where: { id },
    data: {
      status,
      adminNotes: adminNotes || null,
      notes: notes || null,
      cancelledAt: status === "CANCELLED" ? (current.cancelledAt ?? new Date()) : null,
      cancelledBy: status === "CANCELLED" ? (current.cancelledBy ?? "admin") : null,
    },
  });
  revalidateAdmin();
  return { success: "Appointment updated." };
}

// ---------- Users ----------
export async function setUserRole(userId: string, role: "CUSTOMER" | "ADMIN"): Promise<void> {
  const me = await requireAdmin();
  if (me.id === userId && role !== "ADMIN") return; // never demote yourself
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidateAdmin();
}
