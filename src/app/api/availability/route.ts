import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAvailableSlots, getBookableDays } from "@/lib/availability";
import { getSettings } from "@/lib/settings";
import { dateStrInTz, isValidDateStr } from "@/lib/time";
import { isDeviceEnrolled } from "@/lib/device";

/**
 * GET /api/availability?providerId=…&date=YYYY-MM-DD           -> slots for one day
 * GET /api/availability?providerId=…&from=YYYY-MM-DD&days=14    -> which days have any slot
 * Admins may pass &admin=1 (ignores min-notice / booking-window) and &ignore=<appointmentId>.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const providerId = url.searchParams.get("providerId");
  if (!providerId) return NextResponse.json({ error: "providerId required" }, { status: 400 });

  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN" && (await isDeviceEnrolled());
  const forAdmin = isAdmin && url.searchParams.get("admin") === "1";
  const ignoreAppointmentId = url.searchParams.get("ignore") || undefined;

  const settings = await getSettings();
  const date = url.searchParams.get("date");
  if (date) {
    if (!isValidDateStr(date)) return NextResponse.json({ error: "bad date" }, { status: 400 });
    const slots = await getAvailableSlots({ providerId, dateStr: date, forAdmin, ignoreAppointmentId });
    return NextResponse.json({ timezone: settings.timezone, slots });
  }

  const from = url.searchParams.get("from") || dateStrInTz(new Date(), settings.timezone);
  const days = Math.min(Math.max(Number(url.searchParams.get("days") || 14), 1), 60);
  if (!isValidDateStr(from)) return NextResponse.json({ error: "bad from" }, { status: 400 });
  const result = await getBookableDays(providerId, from, days, { forAdmin, ignoreAppointmentId });
  return NextResponse.json({ timezone: settings.timezone, days: result });
}
