import express, { Router } from "express";
import type Stripe from "stripe";
import { asyncHandler, HttpError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { getStripe } from "../lib/stripe";
import { fulfillPayment } from "../services/paymentService";

export const webhookRoutes = Router();

// ต้องใช้ body ดิบ (raw) เพราะ Stripe เซ็นลายเซ็นจากไบต์ต้นฉบับ → router นี้ต้องถูก mount ก่อน express.json()
webhookRoutes.post("/stripe", express.raw({ type: "application/json" }), asyncHandler(async (req, res) => {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers["stripe-signature"];
  if (!secret) throw new HttpError(503, "ยังไม่ได้ตั้งค่า Stripe webhook");
  if (typeof signature !== "string") throw new HttpError(400, "ไม่พบ Stripe signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, secret);
  } catch {
    throw new HttpError(400, "ตรวจสอบ Stripe webhook ไม่ผ่าน");
  }

  // Stripe ส่ง event ซ้ำได้ → จำ id ไว้ ไม่ประมวลผลซ้ำ
  if (await prisma.webhookEvent.findUnique({ where: { id: event.id } })) return void res.json({ received: true, duplicate: true });
  await prisma.webhookEvent.create({ data: { id: event.id } });

  if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.payment_failed") {
    const ok = event.type === "payment_intent.succeeded";
    await prisma.payment.updateMany({
      where: { stripePaymentIntentId: (event.data.object as Stripe.PaymentIntent).id },
      data: { status: ok ? "succeeded" : "failed", paidAt: ok ? new Date() : null }
    });
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const paymentId = session.metadata?.paymentId;
    if (paymentId && session.payment_status === "paid") {
      const intent = typeof session.payment_intent === "string" ? session.payment_intent : null;
      await prisma.$transaction((tx) => fulfillPayment(tx, paymentId, intent));
    }
  }

  await prisma.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
  res.json({ received: true });
}));
