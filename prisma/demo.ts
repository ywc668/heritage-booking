// Adds a handful of sample customers and bookings for demos. Safe to re-run.
import { PrismaClient } from "@prisma/client";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { addDays, addMinutes } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const provider = await prisma.provider.findFirst({ where: { active: true } });
  if (!settings || !provider) throw new Error("Run db:seed first");
  const tz = settings.timezone;

  const customers = [
    { email: "emma.wong@example.com", name: "Emma Wong", phone: "0412 345 678" },
    { email: "liam.chen@example.com", name: "Liam Chen", phone: "0401 222 333" },
    { email: "sophie.lee@example.com", name: "Sophie Lee", phone: "0433 999 000" },
    { email: "noah.patel@example.com", name: "Noah Patel", phone: "0455 111 222" },
  ];
  const users = [];
  for (const c of customers) users.push(await prisma.user.upsert({ where: { email: c.email }, update: c, create: c }));

  // today + next few days, a few times each (in business local time)
  const plan: [number, string, number][] = [[0, "10:00", 0], [0, "11:20", 1], [0, "14:00", 2], [1, "09:00", 3], [1, "15:40", 0], [2, "10:20", 1], [3, "16:00", 2], [5, "11:00", 3]];
  const today = formatInTimeZone(new Date(), tz, "yyyy-MM-dd");
  let created = 0;
  for (const [dayOffset, hhmm, u] of plan) {
    const dateStr = formatInTimeZone(addDays(new Date(`${today}T12:00:00Z`), dayOffset), "UTC", "yyyy-MM-dd");
    const startsAt = fromZonedTime(`${dateStr}T${hhmm}:00`, tz);
    const endsAt = addMinutes(startsAt, provider.slotMinutes);
    const clash = await prisma.appointment.count({ where: { providerId: provider.id, status: "BOOKED", startsAt: { lt: endsAt }, endsAt: { gt: startsAt } } });
    if (clash) continue;
    await prisma.appointment.create({ data: { userId: users[u].id, providerId: provider.id, startsAt, endsAt, notes: u === 0 ? "Contact lens check" : null } });
    created++;
  }
  console.log(`Demo data ready: ${customers.length} customers, ${created} new bookings`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
