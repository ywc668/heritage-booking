import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { localMinutesToInstant, nextDateStr, startOfDayInTz, weekdayOf, dateStrInTz } from "@/lib/time";
import { addDays, addMinutes } from "date-fns";

export type Slot = { startsAt: string; endsAt: string };

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Compute open slots for a provider on a calendar date (in the business timezone).
 * - `forAdmin` ignores the min-notice / booking-window rules (admins may book anything in the future).
 * - `ignoreAppointmentId` excludes one appointment from the conflict check (used when rescheduling).
 */
export async function getAvailableSlots(opts: {
  providerId: string;
  dateStr: string;
  forAdmin?: boolean;
  ignoreAppointmentId?: string;
  now?: Date;
}): Promise<Slot[]> {
  const { providerId, dateStr, forAdmin = false, ignoreAppointmentId } = opts;
  const now = opts.now ?? new Date();
  const settings = await getSettings();
  const tz = settings.timezone;

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    include: { workingHours: { where: { weekday: weekdayOf(dateStr), enabled: true } } },
  });
  if (!provider || !provider.active) return [];
  const hours = provider.workingHours[0];
  if (!hours) return [];

  const dayStart = startOfDayInTz(dateStr, tz);
  const dayEnd = startOfDayInTz(nextDateStr(dateStr), tz);

  const [appointments, timeOff] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        providerId,
        status: "BOOKED",
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
        ...(ignoreAppointmentId ? { id: { not: ignoreAppointmentId } } : {}),
      },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.timeOff.findMany({
      where: { providerId, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } },
      select: { startsAt: true, endsAt: true },
    }),
  ]);
  const busy = [...appointments, ...timeOff];

  const earliest = forAdmin ? now : addMinutes(now, settings.minNoticeMinutes);
  const latest = forAdmin ? null : addDays(now, settings.bookingWindowDays);

  const step = provider.slotMinutes + provider.bufferMinutes;
  const slots: Slot[] = [];
  for (let m = hours.startMinutes; m + provider.slotMinutes <= hours.endMinutes; m += step) {
    const start = localMinutesToInstant(dateStr, m, tz);
    const end = addMinutes(start, provider.slotMinutes);
    if (start < earliest) continue;
    if (latest && start > latest) continue;
    if (busy.some((b) => overlaps(start, end, b.startsAt, b.endsAt))) continue;
    slots.push({ startsAt: start.toISOString(), endsAt: end.toISOString() });
  }
  return slots;
}

/** Is this exact slot bookable right now? Used to validate before writing. */
export async function isSlotAvailable(opts: {
  providerId: string;
  startsAt: Date;
  forAdmin?: boolean;
  ignoreAppointmentId?: string;
}) {
  const settings = await getSettings();
  const dateStr = dateStrInTz(opts.startsAt, settings.timezone);
  const slots = await getAvailableSlots({ ...opts, dateStr });
  return slots.some((s) => s.startsAt === opts.startsAt.toISOString());
}

/** Calendar days (date strings) the customer may browse, with a flag for days that have any slot. */
export async function getBookableDays(providerId: string, fromDateStr: string, count: number) {
  const days: { dateStr: string; hasSlots: boolean }[] = [];
  let d = fromDateStr;
  for (let i = 0; i < count; i++) {
    const slots = await getAvailableSlots({ providerId, dateStr: d });
    days.push({ dateStr: d, hasSlots: slots.length > 0 });
    d = nextDateStr(d);
  }
  return days;
}
