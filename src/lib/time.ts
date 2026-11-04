import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { addDays } from "date-fns";

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Minutes since midnight -> "09:00" */
export function minutesToHHMM(m: number) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** "09:00" -> minutes since midnight */
export function hhmmToMinutes(s: string) {
  const [h, m] = s.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) throw new Error(`Invalid time: ${s}`);
  return h * 60 + m;
}

/** Calendar date (YYYY-MM-DD) in the given timezone for an instant. */
export function dateStrInTz(date: Date, tz: string) {
  return formatInTimeZone(date, tz, "yyyy-MM-dd");
}

/** Instant at local midnight (in tz) for a calendar date string. */
export function startOfDayInTz(dateStr: string, tz: string) {
  return fromZonedTime(`${dateStr}T00:00:00`, tz);
}

/** Instant for a calendar date + minutes since local midnight. DST-safe. */
export function localMinutesToInstant(dateStr: string, minutes: number, tz: string) {
  return fromZonedTime(`${dateStr}T${minutesToHHMM(minutes)}:00`, tz);
}

/** Weekday (0=Sun) of a calendar date string — independent of timezone. */
export function weekdayOf(dateStr: string) {
  return new Date(`${dateStr}T12:00:00Z`).getUTCDay();
}

export function nextDateStr(dateStr: string) {
  return formatInTimeZone(addDays(new Date(`${dateStr}T12:00:00Z`), 1), "UTC", "yyyy-MM-dd");
}

export function fmt(date: Date, tz: string, pattern = "EEE d MMM yyyy, h:mm a") {
  return formatInTimeZone(date, tz, pattern);
}

export function isValidDateStr(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}
