import type { BookingInput } from "@babe-bar/shared";
import type { Prisma } from "@prisma/client";
import { HttpError } from "../lib/errors";
import { makeCode } from "../lib/codes";
import { prisma } from "../lib/prisma";
import { getStripe } from "../lib/stripe";
import { bangkokHour, toDateOnly } from "../lib/time";

const HOLD_MINUTES = 15;
const GRACE_MINUTES = 15;
const OPEN_HOUR = 6; // เปิดรับจอง 06:00
const CLOSE_HOUR = 20; // ปิดรับจอง 20:00
const ARRIVAL_END_HOUR = 2; // เวลาเข้าร้านได้ 20:00-02:00
const bookingTestMode = () => process.env.BOOKING_TEST_MODE === "true";

/** การจองที่ "ถือโต๊ะอยู่" = ยืนยันแล้ว หรือรอจ่ายแต่ยังไม่หมดเวลาถือโต๊ะ */
const holdingTable = (now: Date): Prisma.BookingWhereInput => ({
  OR: [{ status: { in: ["confirmed", "checked_in"] } }, { status: "pending_payment", holdExpiresAt: { gt: now } }]
});
export const bookingService = {
  async availability(date: string) {
    const tables = await prisma.venueTable.findMany({
      where: { isActive: true },
      include: { zone: true, bookings: { where: { businessDate: toDateOnly(date), ...holdingTable(new Date()) }, select: { id: true } } },
      orderBy: { tableNo: "asc" }
    });
    return tables.map((t) => ({
      id: t.id,
      tableNo: t.tableNo,
      capacityMin: t.capacityMin,
      capacityMax: t.capacityMax,
      isVip: t.isVip,
      zone: t.zone.nameTh,
      available: t.bookings.length === 0
    }));
  },

  async create(userId: string, input: BookingInput) {
    const hour = bangkokHour();
    if (!bookingTestMode() && (hour < OPEN_HOUR || hour >= CLOSE_HOUR)) throw new HttpError(400, "ระบบจองเปิดทุกวัน 06:00-20:00");
    const arrivalHour = bangkokHour(input.arrivalAt);
    if (arrivalHour < CLOSE_HOUR && arrivalHour >= ARRIVAL_END_HOUR) throw new HttpError(400, "เวลาเข้าร้านต้องอยู่ในช่วง 20:00-02:00");

    // Serializable: ถ้าสองคนจองโต๊ะเดียวกันพร้อมกัน ฐานข้อมูลจะให้ผ่านแค่คนเดียว (อีกคนได้ 409)
    return prisma.$transaction(
      async (tx) => {
        const table = await tx.venueTable.findUnique({ where: { id: input.tableId } });
        if (!table || !table.isActive) throw new HttpError(404, "ไม่พบโต๊ะนี้");

        const businessDate = toDateOnly(input.businessDate);
        const taken = await tx.booking.findFirst({ where: { tableId: table.id, businessDate, ...holdingTable(new Date()) }, select: { id: true } });
        if (taken) throw new HttpError(409, "โต๊ะนี้ถูกจองแล้วในวันดังกล่าว");

        const booking = await tx.booking.create({
          data: {
            bookingCode: makeCode("BB"),
            userId,
            tableId: table.id,
            businessDate,
            partySizeRange: input.partySizeRange,
            guestName: input.guestName,
            arrivalAt: input.arrivalAt,
            graceUntil: new Date(input.arrivalAt.getTime() + GRACE_MINUTES * 60_000),
            specialRequest: input.specialRequest,
            holdExpiresAt: new Date(Date.now() + HOLD_MINUTES * 60_000)
          }
        });
        const payment = await tx.payment.create({
          data: { userId, purpose: "booking_deposit", bookingId: booking.id, method: "card", amountSatang: booking.depositSatang, idempotencyKey: `stripe_booking_${booking.id}` }
        });
        return { booking, payment: { amountSatang: booking.depositSatang, status: "pending", paymentId: payment.id } };
      },
      { isolationLevel: "Serializable" }
    );
  },

  async paymentIdForBooking(userId: string, bookingCode: string) {
    getStripe(); // ต้องตั้งค่า Stripe ก่อนถึงจะจ่ายได้
    const booking = await prisma.booking.findFirst({ where: { bookingCode, userId, status: "pending_payment" } });
    if (!booking) throw new HttpError(404, "ไม่พบรายการจองหรือรายการนี้ชำระเงินแล้ว");
    if (booking.holdExpiresAt && booking.holdExpiresAt < new Date()) throw new HttpError(409, "เวลาถือโต๊ะหมดอายุแล้ว กรุณาจองใหม่");
    const payment = await prisma.payment.findFirstOrThrow({ where: { bookingId: booking.id } });
    return payment.id;
  }
};
