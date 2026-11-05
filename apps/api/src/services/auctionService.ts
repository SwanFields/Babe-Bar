import type { Prisma } from "@prisma/client";
import type { AuctionScheduleInput, BidInput } from "@babe-bar/shared";
import { rankBidders } from "../lib/auctionRanking";
import { HttpError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { getStripe, isStripeConfigured } from "../lib/stripe";
import { businessDate, toDateOnly } from "../lib/time";

export const DRINK_SATANG = 25_000; // 1 ดริ้ง = 250 บาท = 25,000 สตางค์
const DEFAULT_OPEN = "19:00";
const DEFAULT_CLOSE = "20:00";
const withHosts = { items: { include: { host: true }, orderBy: { sortOrder: "asc" } } } satisfies Prisma.AuctionSessionInclude;

/** ค่าเริ่มต้นของรายการประมูลทุกครั้งที่เปิดรอบใหม่/รีเซ็ต */
const freshItem = { status: "open", startPriceSatang: 0, minIncrementSatang: DRINK_SATANG, currentPriceSatang: 0, leadingUserId: null, winnerUserId: null } as const;

const statusAt = (s: { opensAt: Date; closesAt: Date }, now = new Date()) => (now >= s.closesAt ? "closed" : now >= s.opensAt ? "open" : "scheduled");
const todayKey = () => toDateOnly(businessDate());

export const auctionService = {
  /** รอบประมูลวันนี้ (สร้างอัตโนมัติจากโฮสต์ 5 คนแรก ถ้ายังไม่มี) พร้อมปรับสถานะตามเวลา */
  async today() {
    let session = await prisma.auctionSession.findUnique({ where: { businessDate: todayKey() }, include: withHosts });
    if (!session) {
      const hosts = await prisma.host.findMany({ where: { isActive: true }, orderBy: { id: "asc" }, take: 5 });
      if (hosts.length < 5) throw new HttpError(409, "ยังมีโฮสต์ไม่ครบ 5 คนสำหรับการประมูลวันนี้");
      const date = businessDate();
      const opensAt = new Date(`${date}T${DEFAULT_OPEN}:00+07:00`);
      const closesAt = new Date(`${date}T${DEFAULT_CLOSE}:00+07:00`);
      session = await prisma.auctionSession.create({
        data: {
          businessDate: todayKey(),
          opensAt,
          closesAt,
          status: statusAt({ opensAt, closesAt }),
          items: { create: hosts.map((host, sortOrder) => ({ hostId: host.id, sortOrder })) }
        },
        include: withHosts
      });
    } else {
      const next = statusAt(session);
      if (session.status !== next && session.status !== "settled") {
        session = await prisma.auctionSession.update({ where: { id: session.id }, data: { status: next }, include: withHosts });
      }
    }
    return {
      ...session,
      items: session.items
        .filter((item) => item.host.isActive)
        .map((item) => ({ ...item, currentDrinks: Math.floor(item.currentPriceSatang / DRINK_SATANG), bidUnitSatang: DRINK_SATANG }))
    };
  },

  /**
   * สรุปดริ้งของรอบที่กำลังเปิด: mine = ยอดของผู้ใช้เอง, hosts = อันดับ 1-3 ของแต่ละโฮสต์
   * ใช้ rankBidders ตัวเดียวกับตอนตัดเงิน เพื่อให้อันดับที่เห็นตรงกับคนที่ถูกตัดเงินจริง
   */
  async customerDrips(userId: string) {
    const empty = { mine: { totalDrinks: 0, totalSatang: 0, hosts: [] }, hosts: [] };
    const session = await prisma.auctionSession.findUnique({
      where: { businessDate: todayKey() },
      select: { status: true, opensAt: true, closesAt: true, items: { select: { id: true, hostId: true, host: { select: { stageName: true } } } } }
    });
    const now = new Date();
    const live = session && (session.status === "open" || session.status === "scheduled") && now >= session.opensAt && now < session.closesAt;
    if (!session || !live || session.items.length === 0) return empty;

    const bids = await prisma.bid.findMany({
      where: { auctionItemId: { in: session.items.map((i) => i.id) }, status: "active", createdAt: { gte: session.opensAt } },
      orderBy: { id: "asc" },
      select: { id: true, auctionItemId: true, userId: true, amountSatang: true, user: { select: { username: true } } }
    });

    const perHost = session.items.map((item) => ({
      hostId: item.hostId,
      stageName: item.host.stageName,
      ranking: rankBidders(bids.filter((b) => b.auctionItemId === item.id).map((b) => ({ ...b, username: b.user.username })))
    }));

    const mine = perHost
      .map((h) => ({ hostId: h.hostId, stageName: h.stageName, amountSatang: h.ranking.find((r) => r.userId === userId)?.satang ?? 0 }))
      .filter((h) => h.amountSatang > 0)
      .sort((a, b) => b.amountSatang - a.amountSatang)
      .map((h) => ({ ...h, drinks: Math.floor(h.amountSatang / DRINK_SATANG) }));

    return {
      mine: { totalDrinks: mine.reduce((s, h) => s + h.drinks, 0), totalSatang: mine.reduce((s, h) => s + h.amountSatang, 0), hosts: mine },
      hosts: perHost
        .filter((h) => h.ranking.length > 0)
        .map((h) => ({
          hostId: h.hostId,
          rankings: h.ranking.slice(0, 3).map((r, i) => ({
            rank: i + 1,
            userId: r.userId,
            username: r.username,
            drinks: Math.floor(r.satang / DRINK_SATANG),
            amountSatang: r.satang,
            isMe: r.userId === userId
          }))
        }))
    };
  },

  async placeBid(userId: string, itemId: number, input: BidInput) {
    const item = await prisma.auctionItem.findUnique({ where: { id: itemId }, include: { session: true } });
    if (!item || item.status !== "open" || item.session.status !== "open") throw new HttpError(409, "การประมูลยังไม่เปิดหรือปิดแล้ว");
    const method = await prisma.paymentMethod.findFirst({ where: { id: input.paymentMethodId, userId, detachedAt: null } });
    if (!method) throw new HttpError(400, "กรุณาผูกบัตรก่อนเข้าประมูล");

    const amountSatang = item.currentPriceSatang + input.amountDrinks * DRINK_SATANG;
    return prisma.$transaction(async (tx) => {
      // optimistic concurrency: อัปเดตได้ก็ต่อเมื่อราคายังเท่าที่อ่านมา ถ้ามีคนบิดตัดหน้า count จะเป็น 0
      const updated = await tx.auctionItem.updateMany({
        where: { id: item.id, status: "open", currentPriceSatang: item.currentPriceSatang },
        data: { currentPriceSatang: amountSatang, leadingUserId: userId }
      });
      if (!updated.count) throw new HttpError(409, "มีผู้ประมูลรายอื่นเสนอราคาก่อนหน้า กรุณารีเฟรช");
      await tx.bid.create({ data: { auctionItemId: item.id, userId, paymentMethodId: method.id, amountSatang, termsVersion: "auction-v1", termsAcceptedAt: new Date() } });
      return tx.auctionItem.findUnique({ where: { id: item.id }, include: { host: true } });
    });
  },

  async schedule(input: AuctionScheduleInput) {
    const { opensAt, closesAt } = input;
    const date = toDateOnly(businessDate(opensAt));
    const hostIds = [...new Set(input.hostIds)];
    const hosts = await prisma.host.findMany({ where: { id: { in: hostIds }, isActive: true } });
    if (hosts.length !== hostIds.length) throw new HttpError(409, "พบโฮสต์บางคนไม่พร้อมสำหรับการประมูล");

    return prisma.$transaction(async (tx) => {
      const session = await tx.auctionSession.upsert({
        where: { businessDate: date },
        update: { opensAt, closesAt, status: "scheduled" },
        create: { businessDate: date, opensAt, closesAt, status: "scheduled" }
      });
      await tx.bid.updateMany({ where: { auctionItem: { sessionId: session.id }, status: "active" }, data: { status: "archived" } });
      await tx.auctionItem.updateMany({ where: { sessionId: session.id, hostId: { notIn: hostIds } }, data: { status: "closed" } });
      for (const [sortOrder, hostId] of hostIds.entries()) {
        const existing = await tx.auctionItem.findFirst({ where: { sessionId: session.id, hostId } });
        if (existing) await tx.auctionItem.update({ where: { id: existing.id }, data: { ...freshItem, sortOrder } });
        else await tx.auctionItem.create({ data: { sessionId: session.id, hostId, sortOrder } });
      }
      return tx.auctionSession.findUniqueOrThrow({ where: { id: session.id }, include: { items: { include: { host: true } } } });
    });
  },

  /** เปิดประมูลทันที 1 ชั่วโมง และรีเซ็ตราคา/บิดเดิม (ใช้ทดสอบ) */
  openNow() {
    const now = new Date();
    return prisma.$transaction(async (tx) => {
      const current = await tx.auctionSession.findUnique({ where: { businessDate: todayKey() } });
      if (!current) throw new HttpError(404, "ยังไม่มีรายการประมูลวันนี้ กรุณาบันทึกเวลาเปิด-ปิดก่อน");
      await tx.bid.updateMany({ where: { auctionItem: { sessionId: current.id }, status: "active" }, data: { status: "archived" } });
      await tx.auctionItem.updateMany({ where: { sessionId: current.id }, data: freshItem });
      return tx.auctionSession.update({
        where: { id: current.id },
        data: { opensAt: now, closesAt: new Date(now.getTime() + 3_600_000), status: "open" },
        include: { items: { include: { host: true } } }
      });
    });
  },

  async closeNow() {
    const session = await prisma.auctionSession.update({
      where: { businessDate: todayKey() },
      data: { closesAt: new Date(), status: "closed" },
      include: { items: { include: { host: true } } }
    });
    const settlement = await this.settle(session.id);
    const failed = settlement.some((r) => r.status === "payment_failed");
    return { session, settlement, warning: failed ? "มีรายการที่ Stripe ตัดเงินไม่สำเร็จ" : null };
  },

  /** ปิดรอบและตัดเงินผู้ชนะของแต่ละโฮสต์ (อันดับ 1 จ่ายเฉพาะยอดที่ตัวเองเพิ่ม) */
  async settle(sessionId: number) {
    const session = await prisma.auctionSession.findUnique({ where: { id: sessionId }, include: { items: true } });
    if (!session) throw new HttpError(404, "ไม่พบรายการประมูล");
    if (session.status === "open" || session.status === "scheduled") {
      await prisma.auctionSession.update({ where: { id: session.id }, data: { status: "closed" } });
    }

    type Result = { itemId: number; status: "paid" | "no_bids" | "payment_failed"; paymentIntentId?: string; error?: string };
    const results: Result[] = [];
    for (const item of session.items) {
      if (item.status === "paid" || item.status === "no_bids") {
        results.push({ itemId: item.id, status: item.status });
        continue;
      }
      const bids = await prisma.bid.findMany({
        where: { auctionItemId: item.id, status: "active", createdAt: { gte: session.opensAt } },
        orderBy: { id: "asc" },
        include: { paymentMethod: true, user: true }
      });
      const winner = rankBidders(bids.map((b) => ({ ...b, username: b.user.username })))[0];
      if (!winner) {
        await prisma.auctionItem.update({ where: { id: item.id }, data: { status: "no_bids" } });
        results.push({ itemId: item.id, status: "no_bids" });
        continue;
      }

      const failPayment = async (error: string) => {
        await prisma.auctionItem.update({ where: { id: item.id }, data: { status: "payment_failed", winnerUserId: winner.userId } });
        results.push({ itemId: item.id, status: "payment_failed", error });
      };
      const { lastBid: bid, satang: amountSatang } = winner;
      if (!isStripeConfigured()) { await failPayment("ยังไม่ได้ตั้งค่า Stripe Test Mode"); continue; }
      if (!bid.user.stripeCustomerId) { await failPayment("ผู้ชนะยังไม่มี Stripe Customer"); continue; }

      // idempotencyKey เดียวกัน = retry/cron รันซ้ำก็ไม่ตัดเงินสองรอบ (เปลี่ยนบิด/ยอด = key ใหม่)
      const idempotencyKey = `auction_${session.id}_${item.id}_bid_${bid.id}_amt_${amountSatang}`;
      try {
        const intent = await getStripe().paymentIntents.create(
          {
            amount: amountSatang,
            currency: "thb",
            customer: bid.user.stripeCustomerId,
            payment_method: bid.paymentMethod.stripePaymentMethodId,
            off_session: true,
            confirm: true,
            metadata: { auctionItemId: String(item.id), sessionId: String(session.id), userId: winner.userId, rank: "1" }
          },
          { idempotencyKey }
        );
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
        await failPayment(error instanceof Error ? error.message : "Stripe ไม่สามารถตัดเงินได้");
      }
    }
    return results;
  }
};
