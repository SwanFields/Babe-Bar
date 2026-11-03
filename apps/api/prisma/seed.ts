import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function main() {
  const front = await prisma.zone.upsert({ where: { code: "front" }, update: {}, create: { code: "front", nameTh: "โซนด้านหน้า" } });
  await prisma.venueTable.createMany({ data: [{ zoneId: front.id, tableNo: "A1", capacityMax: 4, isVip: true }, { zoneId: front.id, tableNo: "A2", capacityMax: 6 }] }).catch(() => undefined);
  await prisma.host.createMany({ data: [{ stageName: "Luna", bio: "The neon star" }, { stageName: "Mimi", bio: "Good vibes only" } ] }).catch(() => undefined);
  await prisma.package.createMany({ data: [{ code: "LUCKY", name: "Lucky Night", priceSatang: 59900, includes: ["เครื่องดื่ม 2 แก้ว"], sortOrder: 1 }, { code: "BUFFET", name: "Party Buffet", priceSatang: 129900, includes: ["เครื่องดื่มไม่อั้น"], sortOrder: 2 }, { code: "ONE_ONLY", name: "One Only Host", priceSatang: 199900, includes: ["เลือกโฮสต์ 1 คน"], requiresHostPick: true, sortOrder: 3 }] }).catch(() => undefined);
  await prisma.user.upsert({ where: { email: "admin@babebar.local" }, update: {}, create: { email: "admin@babebar.local", passwordHash: await bcrypt.hash("Admin1234!", 12), fullName: "Babe Bar Admin", phone: "0800000000", username: "admin", birthDate: new Date("1990-01-01"), role: UserRole.admin } });
}
main().finally(() => prisma.$disconnect());
