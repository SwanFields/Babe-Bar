import cron from "node-cron";
import { prisma } from "./lib/prisma";
import { auctionService } from "./services/auctionService";
import { expireStaleTickets } from "./services/ticketService";

async function expireBookings() {
  const now = new Date();
  await prisma.booking.updateMany({ where: { status: "pending_payment", holdExpiresAt: { lt: now } }, data: { status: "expired" } });
  await prisma.booking.updateMany({ where: { status: "confirmed", graceUntil: { lt: now } }, data: { status: "no_show", depositForfeited: true } });
}

async function advanceAuctions() {
  const now = new Date();
  await prisma.auctionSession.updateMany({ where: { opensAt: { lte: now }, closesAt: { gt: now }, status: "scheduled" }, data: { status: "open" } });
  const closing = await prisma.auctionSession.findMany({ where: { closesAt: { lte: now }, status: "open" }, select: { id: true } });
  for (const { id } of closing) await auctionService.settle(id);
}

/** cron อย่าปล่อยให้ error หลุดจนทำให้งานรอบถัดไปเงียบหาย */
const safely = (name: string, job: () => Promise<unknown>) => () => job().catch((error) => console.error(`${name} failed:`, error));

export function startJobs() {
  void safely("expireStaleTickets", expireStaleTickets)();
  cron.schedule("* * * * *", safely("tickets/bookings", async () => { await expireStaleTickets(); await expireBookings(); }));
  cron.schedule("*/2 * * * *", safely("auctions", advanceAuctions));
}
