import { prisma } from "@/lib/db";

export async function getSettings() {
  return prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, timezone: process.env.BUSINESS_TIMEZONE || "Australia/Sydney" },
  });
}
