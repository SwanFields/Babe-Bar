import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function main() {
  const front = await prisma.zone.upsert({ where: { code: "front" }, update: {}, create: { code: "front", nameTh: "โซนด้านหน้า" } });
  const back = await prisma.zone.upsert({ where: { code: "back" }, update: {}, create: { code: "back", nameTh: "โซนด้านหลัง" } });
  const center = await prisma.zone.upsert({ where: { code: "center" }, update: {}, create: { code: "center", nameTh: "โซนกลาง" } });
  const vip = await prisma.zone.upsert({ where: { code: "vip" }, update: {}, create: { code: "vip", nameTh: "โซน VIP" } });
  const stage = await prisma.zone.upsert({ where: { code: "stage" }, update: {}, create: { code: "stage", nameTh: "โซนหน้าเวที" } });
  const restroom = await prisma.zone.upsert({ where: { code: "restroom" }, update: {}, create: { code: "restroom", nameTh: "โซนใกล้ห้องน้ำ" } });
  const tables = [
    { zoneId: front.id, tableNo: "A1", capacityMax: 4, isVip: false },
    { zoneId: front.id, tableNo: "A2", capacityMax: 6, isVip: false },
    { zoneId: front.id, tableNo: "A3", capacityMax: 4, isVip: false },
    { zoneId: back.id, tableNo: "B1", capacityMax: 4, isVip: false },
    { zoneId: back.id, tableNo: "B2", capacityMax: 6, isVip: false },
    { zoneId: back.id, tableNo: "B3", capacityMax: 8, isVip: false },
    { zoneId: center.id, tableNo: "C1", capacityMax: 4, isVip: false },
    { zoneId: center.id, tableNo: "C2", capacityMax: 6, isVip: false },
    { zoneId: center.id, tableNo: "C3", capacityMax: 8, isVip: false },
    { zoneId: vip.id, tableNo: "V1", capacityMax: 4, isVip: true },
    { zoneId: vip.id, tableNo: "V2", capacityMax: 6, isVip: true },
    { zoneId: vip.id, tableNo: "V3", capacityMax: 8, isVip: true },
    { zoneId: stage.id, tableNo: "S1", capacityMax: 4, isVip: true },
    { zoneId: stage.id, tableNo: "S2", capacityMax: 6, isVip: true },
    { zoneId: restroom.id, tableNo: "R1", capacityMax: 4 },
    { zoneId: restroom.id, tableNo: "R2", capacityMax: 6 },
    { zoneId: restroom.id, tableNo: "R3", capacityMax: 8 }
  ];
  for (const table of tables) {
    await prisma.venueTable.upsert({ where: { tableNo: table.tableNo }, update: table, create: table });
  }
  for (const host of [
    { stageName: "Luna", bio: "The neon star" },
    { stageName: "Mimi", bio: "Good vibes only" },
    { stageName: "Nana", bio: "Neon mood maker" },
    { stageName: "Pim", bio: "Good times specialist" },
    { stageName: "Sora", bio: "Midnight energy" }
  ]) {
    await prisma.host.upsert({ where: { stageName: host.stageName }, update: host, create: host });
  }
  await prisma.package.createMany({ data: [{ code: "LUCKY", name: "Lucky Package", description: "สุ่มเครื่องดื่มค็อกเทลราคาพิเศษ 6 แก้ว", priceSatang: 99900, includes: ["ค็อกเทล 6 แก้ว"], sortOrder: 1 }, { code: "BUFFET", name: "Buffet ของทอด", description: "ของทอดสั่งได้ไม่อั้น", priceSatang: 59900, includes: ["Buffet ของทอดไม่อั้น"], sortOrder: 2 }, { code: "ONE_ONLY", name: "ONE & ONLY", description: "เลือกโฮสต์ 1 คน พร้อมโต๊ะ VIP และของพิเศษ", priceSatang: 399900, includes: ["เลือกโฮสต์ 1 คน", "โต๊ะ VIP", "ค็อกเทล 8 แก้ว", "โพลารอยด์ 5 รูป", "Surprise Box", "Buffet ของทอด"], requiresHostPick: true, sortOrder: 3 }] }).catch(() => undefined);
  await prisma.user.upsert({ where: { email: "admin@babebar.local" }, update: {}, create: { email: "admin@babebar.local", passwordHash: await bcrypt.hash("Admin1234!", 12), fullName: "Babe Bar Admin", phone: "0800000000", username: "admin", birthDate: new Date("1990-01-01"), role: UserRole.admin } });
}
main().finally(() => prisma.$disconnect());
