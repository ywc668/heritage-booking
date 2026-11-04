import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { localMinutesToInstant, nextDateStr, startOfDayInTz, weekdayOf, dateStrInTz } from "@/lib/time";
import { addDays, addMinutes } from "date-fns";
import type { Provider, Settings, WorkingHours } from "@prisma/client";

export type Slot = { startsAt: string; endsAt: string };
type Busy = { startsAt: Date; endsAt: Date };

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

/** Everything needed to compute slots for a provider over a date range, loaded with 4 queries total. */
type Context = {
  settings: Settings;
  provider: (Provider & { workingHours: WorkingHours[] }) | null;
  busy: Busy[];
};

async function loadContext(providerId: string, fromDateStr: string, toDateStrExclusive: string, ignoreAppointmentId?: string): Promise<Context> {
  const settings = await getSettings();
  const tz = settings.timezone;
  const rangeStart = startOfDayInTz(fromDateStr, tz);
  const rangeEnd = startOfDayInTz(toDateStrExclusive, tz);
  const [provider, appointments, timeOff] = await Promise.all([
    prisma.provider.findUnique({ where: { id: providerId }, include: { workingHours: { where: { enabled: true } } } }),
    prisma.appointment.findMany({
      where: {
        providerId,
        status: "BOOKED",
        startsAt: { lt: rangeEnd },
        endsAt: { gt: rangeStart },
        ...(ignoreAppointmentId ? { id: { not: ignoreAppointmentId } } : {}),
      },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.timeOff.findMany({
      where: { providerId, startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } },
      select: { startsAt: true, endsAt: true },
    }),
  ]);
  return { settings, provider, busy: [...appointments, ...timeOff] };
}

/** Pure slot computation for one calendar day from a loaded context. */
function computeSlots(ctx: Context, dateStr: string, forAdmin: boolean, now: Date): Slot[] {
  const { settings, provider, busy } = ctx;
  if (!provider || !provider.active) return [];
  const hours = provider.workingHours.find((h) => h.weekday === weekdayOf(dateStr));
  if (!hours) return [];
  const tz = settings.timezone;
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

/**
 * Open slots for a provider on a calendar date (in the business timezone).
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
  const ctx = await loadContext(opts.providerId, opts.dateStr, nextDateStr(opts.dateStr), opts.ignoreAppointmentId);
  return computeSlots(ctx, opts.dateStr, opts.forAdmin ?? false, opts.now ?? new Date());
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

/** Calendar days the customer may browse, with a flag for days that have any slot. One batch of queries. */
export async function getBookableDays(
  providerId: string,
  fromDateStr: string,
  count: number,
  opts: { forAdmin?: boolean; ignoreAppointmentId?: string } = {},
) {
  const dates: string[] = [];
  let d = fromDateStr;
  for (let i = 0; i < count; i++) { dates.push(d); d = nextDateStr(d); }
  const ctx = await loadContext(providerId, fromDateStr, d, opts.ignoreAppointmentId);
  const now = new Date();
  return dates.map((dateStr) => ({ dateStr, hasSlots: computeSlots(ctx, dateStr, opts.forAdmin ?? false, now).length > 0 }));
}
