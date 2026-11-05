import type { Prisma } from "@prisma/client";
import type { CheckoutInput, PackageOrderInput } from "@babe-bar/shared";
import { makeCode, makeQrToken } from "../lib/codes";
import { HttpError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { getStripe } from "../lib/stripe";
import { toDateOnly } from "../lib/time";

const TABLE_TICKET_GRACE_MIN = 30; // ตั๋วโต๊ะใช้ได้ถึง 30 นาทีหลังเวลาเข้าร้าน
const PACKAGE_TICKET_DAYS = 7;
const webOrigin = () => process.env.WEB_ORIGIN ?? "http://localhost:5173";

/**
 * ทำให้การชำระเงินสำเร็จ: payment → succeeded, booking/order → ยืนยัน, ออก ETicket
 * ใช้ร่วมกันทั้ง webhook และหน้า confirm (เดิมเขียนซ้ำสองที่) และเรียกซ้ำได้ปลอดภัย (upsert)
 * คืน false ถ้าไม่พบรายการ หรือไม่ใช่ของ ownerId
 */
export async function fulfillPayment(tx: Prisma.TransactionClient, paymentId: string, paymentIntentId: string | null, ownerId?: string) {
  const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { booking: true, packageOrder: true } });
  if (!payment || (ownerId && payment.userId !== ownerId)) return false;

  await tx.payment.update({ where: { id: payment.id }, data: { status: "succeeded", stripePaymentIntentId: paymentIntentId, paidAt: payment.paidAt ?? new Date() } });

  if (payment.booking) {
    const { id, arrivalAt } = payment.booking;
    await tx.booking.update({ where: { id }, data: { status: "confirmed", holdExpiresAt: null } });
    await tx.eTicket.upsert({
      where: { bookingId: id },
      update: {},
      create: {
        ticketCode: makeCode("T"),
        qrToken: makeQrToken(),
        userId: payment.userId,
        ticketType: "table",
        bookingId: id,
        validFrom: arrivalAt,
        validUntil: new Date(arrivalAt.getTime() + TABLE_TICKET_GRACE_MIN * 60_000)
      }
    });
  }
  if (payment.packageOrder) {
    const { id } = payment.packageOrder;
    await tx.packageOrder.update({ where: { id }, data: { status: "paid" } });
    await tx.eTicket.upsert({
      where: { packageOrderId: id },
      update: {},
      create: {
        ticketCode: makeCode("P"),
        qrToken: makeQrToken(),
        userId: payment.userId,
        ticketType: "package",
        packageOrderId: id,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + PACKAGE_TICKET_DAYS * 86_400_000)
      }
    });
  }
  return true;
}

export const paymentService = {
  async createPackageOrder(userId: string, input: PackageOrderInput) {
    const selected = await prisma.package.findFirst({ where: { id: input.packageId, isActive: true } });
    if (!selected) throw new HttpError(404, "ไม่พบแพ็กเกจนี้");
    return prisma.$transaction(async (tx) => {
      const created = await tx.packageOrder.create({
        data: { orderCode: makeCode("PK"), userId, packageId: selected.id, priceSatang: selected.priceSatang, useDate: input.useDate ? toDateOnly(input.useDate) : null }
      });
      const payment = await tx.payment.create({
        data: { userId, purpose: "package", packageOrderId: created.id, method: "card", amountSatang: selected.priceSatang, idempotencyKey: `stripe_package_${created.id}` }
      });
      return { created, paymentId: payment.id };
    });
  },

  /** สร้างหน้าชำระเงินของ Stripe Checkout สำหรับการจองหรือแพ็กเกจ */
  async createCheckout(userId: string, { kind, id }: CheckoutInput) {
    const stripe = getStripe();
    const payment = await prisma.payment.findFirst({
      where: { userId, status: "pending", ...(kind === "booking" ? { bookingId: id } : { packageOrderId: id }) },
      include: { booking: true, packageOrder: { include: { package: true } } }
    });
    if (!payment) throw new HttpError(404, "ไม่พบรายการชำระเงิน");

    const name = payment.booking ? `มัดจำโต๊ะ ${payment.booking.bookingCode}` : payment.packageOrder!.package.name;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price_data: { currency: "thb", product_data: { name }, unit_amount: payment.amountSatang }, quantity: 1 }],
      metadata: { paymentId: payment.id, kind },
      success_url: `${webOrigin()}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${webOrigin()}/${kind === "booking" ? "booking" : "packages"}?payment=cancelled`
    });
    await prisma.payment.update({ where: { id: payment.id }, data: { stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null } });
    return { url: session.url };
  },

  /** หน้า success เรียกยืนยันกับ Stripe โดยตรง (สำรองกรณี webhook มาช้า) */
  async confirmCheckout(userId: string, sessionId: string) {
    const stripe = getStripe();
    if (!sessionId.startsWith("cs_")) throw new HttpError(400, "ไม่พบ Checkout Session");
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paymentId = session.metadata?.paymentId;
    if (session.payment_status !== "paid" || !paymentId) throw new HttpError(409, "การชำระเงินยังไม่ได้รับการยืนยัน");
    const intent = typeof session.payment_intent === "string" ? session.payment_intent : null;
    const ok = await prisma.$transaction((tx) => fulfillPayment(tx, paymentId, intent, userId));
    if (!ok) throw new HttpError(404, "ไม่พบรายการชำระเงินของบัญชีนี้");
    return { confirmed: true };
  }
};
