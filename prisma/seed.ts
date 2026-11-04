import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const tz = process.env.BUSINESS_TIMEZONE || "Australia/Sydney";
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, businessName: "Heritage", timezone: tz, cancelCutoffHours: 24 },
  });

  // Default optometrist: Mon–Sun 09:00–18:00, 20-minute sessions, no buffer.
  const count = await prisma.provider.count();
  if (count === 0) {
    const provider = await prisma.provider.create({
      data: { name: "Optometrist", title: "Optometrist", slotMinutes: 20, bufferMinutes: 0 },
    });
    for (let weekday = 0; weekday < 7; weekday++) {
      await prisma.workingHours.create({
        data: { providerId: provider.id, weekday, startMinutes: 9 * 60, endMinutes: 18 * 60, enabled: true },
      });
    }
    console.log("Created default provider", provider.name);
  }

  const email = (process.env.ADMIN_EMAIL || "admin@heritage.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "change-me-now";
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", passwordHash },
    create: { email, name: "Admin", role: "ADMIN", passwordHash, emailVerified: new Date() },
  });
  console.log("Admin account ready:", email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
