import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";
import { rankBidders } from "./lib/auctionRanking";
const prisma = new PrismaClient();
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Ticket ที่ยังเป็น active แต่เลยเวลา validUntil แล้ว ต้องถูกเปลี่ยนเป็น expired
// (เดิมเปลี่ยนเฉพาะตอนพนักงานสแกนใช้ ทำให้ตั๋วหมดอายุยังขึ้นว่าใช้งานได้)
export async function expireStaleTickets() {
  const result = await prisma.eTicket.updateMany({ where: { status: "active", validUntil: { lt: new Date() } }, data: { status: "expired" } });
  return result.count;
}

export async function settleAuctionSession(sessionId: number) {
  const session = await prisma.auctionSession.findUnique({ where: { id: sessionId }, include: { items: true } });
  if (!session) throw Object.assign(new Error("ไม่พบรายการประมูล"), { status: 404 });
  if (session.status === "open" || session.status === "scheduled") {
    await prisma.auctionSession.update({ where: { id: session.id }, data: { status: "closed" } });
  }
  const results: Array<{ itemId: number; status: "paid" | "no_bids" | "payment_failed"; paymentIntentId?: string; error?: string }> = [];
  for (const item of session.items) {
    if (item.status === "paid" || item.status === "no_bids") {
      results.push({ itemId: item.id, status: item.status });
      continue;
    }
    // อันดับ 1 เท่านั้นที่ถูกตัดเงิน (เฉพาะยอดที่ตัวเองเพิ่ม) อันดับอื่นถือว่าแพ้และไม่ถูกตัดเงิน
    const bids = await prisma.bid.findMany({
      where: { auctionItemId: item.id, status: "active", createdAt: { gte: session.opensAt } },
      orderBy: { id: "asc" },
      include: { paymentMethod: true, user: true }
    });
    const ranking = rankBidders(bids.map((bid) => ({ ...bid, username: bid.user.username })));
    const winner = ranking[0];
    if (!winner) {
      await prisma.auctionItem.update({ where: { id: item.id }, data: { status: "no_bids" } });
      results.push({ itemId: item.id, status: "no_bids" });
      continue;
    }
    const bid = winner.lastBid;
    const amountSatang = winner.satang;
    if (!stripe || !bid.user.stripeCustomerId) {
      await prisma.auctionItem.update({ where: { id: item.id }, data: { status: "payment_failed", winnerUserId: winner.userId } });
      results.push({
        itemId: item.id,
        status: "payment_failed",
        error: !stripe ? "ยังไม่ได้ตั้งค่า Stripe Test Mode" : "ผู้ชนะยังไม่มี Stripe Customer"
      });
      continue;
    }
    // Keep retries idempotent for the same winner/bid/amount, while allowing a reset/rebid
    // to create a new PaymentIntent with its new amount and payment method.
    const idempotencyKey = `auction_${session.id}_${item.id}_bid_${bid.id}_amt_${amountSatang}`;
    try {
      const intent = await stripe.paymentIntents.create({
        amount: amountSatang,
        currency: "thb",
        customer: bid.user.stripeCustomerId,
        payment_method: bid.paymentMethod.stripePaymentMethodId,
        off_session: true,
        confirm: true,
        metadata: { auctionItemId: String(item.id), sessionId: String(session.id), userId: winner.userId, rank: "1" }
      }, { idempotencyKey });
      await prisma.$transaction([
        prisma.auctionItem.update({ where: { id: item.id }, data: { status: "paid", winnerUserId: winner.userId } }),
        prisma.payment.upsert({
          where: { idempotencyKey },
          update: { status: "succeeded", stripePaymentIntentId: intent.id, paidAt: new Date() },
          create: { userId: winner.userId, purpose: "auction", auctionItemId: item.id, paymentMethodId: bid.paymentMethodId, method: "card", amountSatang, status: "succeeded", stripePaymentIntentId: intent.id, paidAt: new Date(), idempotencyKey }
        })
      ]);
      results.push({ itemId: item.id, status: "paid", paymentIntentId: intent.id });
    } catch (error) {
      console.error(`Auction payment failed for item ${item.id}:`, error);
      await prisma.auctionItem.update({ where: { id: item.id }, data: { status: "payment_failed", winnerUserId: winner.userId } });
      results.push({ itemId: item.id, status: "payment_failed", error: error instanceof Error ? error.message : "Stripe ไม่สามารถตัดเงินได้" });
    }
  }
  return results;
}

export function startJobs() {
  void expireStaleTickets().catch((error) => console.error("expireStaleTickets failed:", error));
  cron.schedule("* * * * *", async () => {
    await expireStaleTickets();
    await prisma.booking.updateMany({ where: { status: "pending_payment", holdExpiresAt: { lt: new Date() } }, data: { status: "expired" } });
    await prisma.booking.updateMany({ where: { status: "confirmed", graceUntil: { lt: new Date() } }, data: { status: "no_show", depositForfeited: true } });
  });
  cron.schedule("*/2 * * * *", async () => {
    await prisma.auctionSession.updateMany({ where: { opensAt: { lte: new Date() }, closesAt: { gt: new Date() }, status: "scheduled" }, data: { status: "open" } });
    const closing = await prisma.auctionSession.findMany({ where: { closesAt: { lte: new Date() }, status: "open" }, select: { id: true } });
    for (const session of closing) {
      await settleAuctionSession(session.id);
    }
  });
}
