import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export function startJobs() {
  cron.schedule("* * * * *", async () => {
    await prisma.booking.updateMany({ where: { status: "pending_payment", holdExpiresAt: { lt: new Date() } }, data: { status: "expired" } });
    await prisma.booking.updateMany({ where: { status: "confirmed", graceUntil: { lt: new Date() } }, data: { status: "no_show", depositForfeited: true } });
  });
  cron.schedule("*/2 * * * *", async () => {
    await prisma.auctionSession.updateMany({ where: { opensAt: { lte: new Date() }, closesAt: { gt: new Date() }, status: "scheduled" }, data: { status: "open" } });
    await prisma.auctionSession.updateMany({ where: { closesAt: { lte: new Date() }, status: "open" }, data: { status: "closed" } });
  });
}
