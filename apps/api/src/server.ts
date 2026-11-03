import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  loginSchema,
  registerSchema,
  bookingSchema,
  bidSchema,
  setupPaymentMethodSchema,
  packageOrderSchema,
  checkoutSchema,
  auctionScheduleSchema,
  createAccountSchema,
  updateUserStatusSchema
} from "@babe-bar/shared";
import { accessToken, hashToken, randomToken } from "./lib/auth";
import { AuthRequest, requireAuth, requireRole, validate } from "./middleware";
import { businessDate } from "./lib/time";
import { settleAuctionSession, startJobs } from "./jobs";
import { userStore } from "./lib/userStore";
import crypto from "node:crypto";
import Stripe from "stripe";

const prisma = new PrismaClient();
const app = express();
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

async function ensureStripeCustomer(user: { id: string; email: string; fullName: string; stripeCustomerId: string | null }) {
  if (!stripe) throw Object.assign(new Error("ยังไม่ได้ตั้งค่า Stripe Test Mode"), { status: 503 });
  if (user.stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      if (!customer.deleted) return user.stripeCustomerId;
    } catch (error) {
      if (!(error instanceof Stripe.errors.StripeError) || error.code !== "resource_missing") throw error;
    }
  }
  const customer = await stripe.customers.create({ email: user.email, name: user.fullName, metadata: { userId: user.id } });
  await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

app.use(helmet());
app.use(cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:5173", credentials: true }));
app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) return res.status(503).json({ error: "ยังไม่ได้ตั้งค่า Stripe webhook" });
  if (typeof signature !== "string") return res.status(400).json({ error: "ไม่พบ Stripe signature" });

  try {
    const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    const existing = await prisma.webhookEvent.findUnique({ where: { id: event.id } });
    if (existing) return res.json({ received: true, duplicate: true });
    await prisma.webhookEvent.create({ data: { id: event.id } });

    if (event.type === "payment_intent.succeeded" || event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      await prisma.payment.updateMany({
        where: { stripePaymentIntentId: intent.id },
        data: {
          status: event.type === "payment_intent.succeeded" ? "succeeded" : "failed",
          paidAt: event.type === "payment_intent.succeeded" ? new Date() : null
        }
      });
    }
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.paymentId;
      if (paymentId && session.payment_status === "paid") {
        await prisma.$transaction(async (tx) => {
          const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { booking: true, packageOrder: true } });
          if (!payment) return;
          await tx.payment.update({ where: { id: payment.id }, data: { status: "succeeded", stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null, paidAt: new Date() } });
          if (payment.booking) {
            await tx.booking.update({ where: { id: payment.booking.id }, data: { status: "confirmed", holdExpiresAt: null } });
            const existingTicket = await tx.eTicket.findUnique({ where: { bookingId: payment.booking.id } });
            if (!existingTicket) await tx.eTicket.create({ data: { ticketCode: `T-${Date.now()}`, qrToken: crypto.randomBytes(16).toString("hex"), userId: payment.userId, ticketType: "table", bookingId: payment.booking.id, validFrom: payment.booking.arrivalAt, validUntil: new Date(payment.booking.arrivalAt.getTime() + 30 * 60000) } });
          }
          if (payment.packageOrder) {
            await tx.packageOrder.update({ where: { id: payment.packageOrder.id }, data: { status: "paid" } });
            const existingTicket = await tx.eTicket.findUnique({ where: { packageOrderId: payment.packageOrder.id } });
            if (!existingTicket) await tx.eTicket.create({ data: { ticketCode: `P-${Date.now()}`, qrToken: crypto.randomBytes(16).toString("hex"), userId: payment.userId, ticketType: "package", packageOrderId: payment.packageOrder.id, validFrom: new Date(), validUntil: new Date(Date.now() + 7 * 86400000) } });
          }
        });
      }
    }
    await prisma.webhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
    res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    res.status(400).json({ error: "ตรวจสอบ Stripe webhook ไม่ผ่าน" });
  }
});
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", rateLimit({ windowMs: 60_000, limit: 30 }));

// Health Check
app.get("/api/health", async (_req, res) => {
  const isPrisma = await userStore.isPrismaAvailable(prisma);
  res.json({
    ok: true,
    businessDate: businessDate(),
    database: {
      type: isPrisma ? "postgresql" : "local_store",
      status: "connected"
    }
  });
});

// --- User Profiles & Dashboard APIs ---

// 1. Get all accounts / profiles
app.get("/api/users", async (_req, res, next) => {
  try {
    const result = await userStore.getAllUsers(prisma);
    res.json({
      total: result.users.length,
      source: result.source,
      users: result.users
    });
  } catch (error) {
    next(error);
  }
});

// 2. Get specific account details
app.get("/api/users/:id", async (req, res, next) => {
  try {
    const user = await userStore.getUserById(prisma, String(req.params.id));
    if (!user) throw Object.assign(new Error("ไม่พบบัญชีผู้ใช้นี้"), { status: 404 });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// 3. Create account from dashboard
app.post("/api/users", validate(createAccountSchema), async (req, res, next) => {
  try {
    const user = await userStore.createUser(prisma, req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

// 4. Update account status or role
app.patch("/api/users/:id", validate(updateUserStatusSchema), async (req, res, next) => {
  try {
    const updated = await userStore.updateUserStatus(prisma, String(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// 5. Seed sample demo accounts for testing
app.post("/api/users/seed-sample", async (_req, res, next) => {
  try {
    const result = await userStore.seedDemoAccounts(prisma);
    const all = await userStore.getAllUsers(prisma);
    res.json({ message: `เพิ่มบัญชีตัวอย่างเรียบร้อย (${result.added} บัญชีใหม่)`, total: all.users.length, users: all.users });
  } catch (error) {
    next(error);
  }
});

// --- Auth APIs ---

app.post("/api/auth/register", validate(registerSchema), async (req, res, next) => {
  try {
    const input = req.body;
    const user = await userStore.createUser(prisma, {
      ...input,
      role: "customer",
      status: "active"
    });

    const refresh = randomToken();
    try {
      await prisma.refreshSession.create({
        data: { userId: user.id, tokenHash: hashToken(refresh), expiresAt: new Date(Date.now() + 30 * 86400000) }
      });
    } catch {
      // Local fallback session
    }

    res.cookie("refresh_token", refresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 86400000
    });

    res.status(201).json({
      accessToken: accessToken(user.id, user.role),
      user: user
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", validate(loginSchema), async (req, res, next) => {
  try {
    const user = await userStore.findByEmailOrUsername(prisma, req.body.email);
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      throw Object.assign(new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง"), { status: 401 });
    }

    if (user.status === "suspended") {
      throw Object.assign(new Error("บัญชีนี้ถูกระงับการใช้งานชั่วคราว"), { status: 403 });
    }

    const refresh = randomToken();
    try {
      await prisma.refreshSession.create({
        data: { userId: user.id, tokenHash: hashToken(refresh), expiresAt: new Date(Date.now() + 30 * 86400000) }
      });
    } catch {
      // Local fallback session
    }

    res.cookie("refresh_token", refresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 86400000
    });

    res.json({
      accessToken: accessToken(user.id, user.role),
      user: user
    });
  } catch (error) {
    next(error);
  }
});

// Quick switch / impersonate for testing accounts from dashboard
app.post("/api/auth/switch-account/:id", async (req, res, next) => {
  try {
    const user = await userStore.getUserById(prisma, String(req.params.id));
    if (!user) throw Object.assign(new Error("ไม่พบบัญชีผู้ใช้นี้"), { status: 404 });

    const refresh = randomToken();
    res.cookie("refresh_token", refresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 86400000
    });

    res.json({
      accessToken: accessToken(user.id, user.role),
      user: user
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/refresh", async (req, res, next) => {
  try {
    const token = req.cookies.refresh_token;
    if (!token) throw Object.assign(new Error("เซสชันหมดอายุ"), { status: 401 });
    
    // Check if session in prisma
    try {
      const session = await prisma.refreshSession.findFirst({
        where: { tokenHash: hashToken(token), revokedAt: null, expiresAt: { gt: new Date() } },
        include: { user: true }
      });
      if (session) {
        return res.json({ accessToken: accessToken(session.user.id, session.user.role) });
      }
    } catch {
      // fallback
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", async (req, res, next) => {
  try {
    const token = req.cookies.refresh_token;
    if (token) {
      try {
        await prisma.refreshSession.updateMany({
          where: { tokenHash: hashToken(token) },
          data: { revokedAt: new Date() }
        });
      } catch {
        // fallback
      }
    }
    res.clearCookie("refresh_token");
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await userStore.getUserById(prisma, req.user!.id);
    if (!user) throw Object.assign(new Error("ไม่พบบัญชีผู้ใช้"), { status: 404 });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// --- Existing venue, packages, and bookings APIs ---

app.get("/api/packages", async (_req, res, next) => {
  try {
    res.json(await prisma.package.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }));
  } catch {
    // Fallback sample packages if database is offline
    res.json([
      { id: 1, code: "LUCKY", name: "Lucky Night", priceSatang: 59900, includes: ["เครื่องดื่ม 2 แก้ว"], sortOrder: 1 },
      { id: 2, code: "BUFFET", name: "Party Buffet", priceSatang: 129900, includes: ["เครื่องดื่มไม่อั้น"], sortOrder: 2 },
      { id: 3, code: "ONE_ONLY", name: "One Only Host", priceSatang: 199900, includes: ["เลือกโฮสต์ 1 คน"], requiresHostPick: true, sortOrder: 3 }
    ]);
  }
});

app.get("/api/hosts", async (_req, res, next) => {
  try {
    res.json(await prisma.host.findMany({ where: { isActive: true } }));
  } catch {
    // Fallback sample hosts if database is offline
    res.json([
      { id: 1, stageName: "Luna", bio: "The neon star" },
      { id: 2, stageName: "Mimi", bio: "Good vibes only" }
    ]);
  }
});

app.get("/api/booking/availability", async (req, res, next) => {
  try {
    const date = String(req.query.businessDate ?? businessDate());
    const now = new Date();
    const tables = await prisma.venueTable.findMany({
      where: { isActive: true },
      include: {
        zone: true,
        bookings: {
          where: {
            businessDate: new Date(`${date}T00:00:00Z`),
            OR: [
              { status: { in: ["confirmed", "checked_in"] } },
              { status: "pending_payment", holdExpiresAt: { gt: now } }
            ]
          },
          select: { id: true }
        }
      },
      orderBy: { tableNo: "asc" }
    });
    res.json(tables.map((table) => ({ id: table.id, tableNo: table.tableNo, capacityMin: table.capacityMin, capacityMax: table.capacityMax, isVip: table.isVip, zone: table.zone.nameTh, available: table.bookings.length === 0 })));
  } catch (error) {
    next(error);
  }
});

app.get("/api/auction/today", async (_req, res, next) => {
  try {
    const date = businessDate();
    let session = await prisma.auctionSession.findUnique({ where: { businessDate: new Date(`${date}T00:00:00Z`) }, include: { items: { include: { host: true } } } });
    if (!session) {
      const hosts = await prisma.host.findMany({ where: { isActive: true }, orderBy: { id: "asc" }, take: 5 });
      if (hosts.length < 5) throw Object.assign(new Error("ยังมีโฮสต์ไม่ครบ 5 คนสำหรับการประมูลวันนี้"), { status: 409 });
      const opensAt = new Date(`${date}T19:00:00+07:00`);
      const closesAt = new Date(`${date}T20:00:00+07:00`);
      const now = new Date();
      session = await prisma.auctionSession.create({
        data: {
          businessDate: new Date(`${date}T00:00:00Z`),
          opensAt,
          closesAt,
          status: now >= closesAt ? "closed" : now >= opensAt ? "open" : "scheduled",
          items: { create: hosts.map((host) => ({ hostId: host.id, startPriceSatang: 0, minIncrementSatang: 25000, currentPriceSatang: 0 })) }
        },
        include: { items: { include: { host: true } } }
      });
    } else {
      const now = new Date();
      const nextStatus = now >= session.closesAt ? "closed" : now >= session.opensAt ? "open" : "scheduled";
      if (session.status !== nextStatus && session.status !== "settled") {
        session = await prisma.auctionSession.update({ where: { id: session.id }, data: { status: nextStatus }, include: { items: { include: { host: true } } } });
      }
    }
    res.json({
      ...session,
      items: session.items.map((item) => ({
        ...item,
        currentDrinks: Math.floor(item.currentPriceSatang / 25000),
        bidUnitSatang: 25000
      }))
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/events", async (_req, res, next) => {
  try {
    const events = await prisma.event.findMany({ where: { isActive: true }, orderBy: { startsAt: "asc" } });
    res.json(events);
  } catch (error) {
    next(error);
  }
});

app.get("/api/auction/payment-methods", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    res.json(await prisma.paymentMethod.findMany({ where: { userId: req.user!.id, detachedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, brand: true, last4: true, expMonth: true, expYear: true, isDefault: true } }));
  } catch (error) { next(error); }
});

app.post("/api/auction/admin/schedule", requireAuth, requireRole("admin"), validate(auctionScheduleSchema), async (req: AuthRequest, res, next) => {
  try {
    const opensAt = new Date(req.body.opensAt);
    const closesAt = new Date(req.body.closesAt);
    const date = businessDate(opensAt);
    const hosts = await prisma.host.findMany({ where: { isActive: true }, orderBy: { id: "asc" }, take: 5 });
    if (hosts.length < 5) throw Object.assign(new Error("ต้องมีโฮสต์อย่างน้อย 5 คนก่อนตั้งเวลาประมูล"), { status: 409 });
    const session = await prisma.auctionSession.upsert({
      where: { businessDate: new Date(`${date}T00:00:00Z`) },
      update: { opensAt, closesAt, status: "scheduled" },
      create: {
        businessDate: new Date(`${date}T00:00:00Z`),
        opensAt,
        closesAt,
        status: "scheduled",
        items: { create: hosts.map((host) => ({ hostId: host.id })) }
      },
      include: { items: { include: { host: true } } }
    });
    await prisma.auctionItem.updateMany({
      where: { sessionId: session.id },
      data: { status: "open", startPriceSatang: 0, minIncrementSatang: 25000, currentPriceSatang: 0, leadingUserId: null, winnerUserId: null }
    });
    res.json(session);
  } catch (error) { next(error); }
});

app.post("/api/auction/admin/open-now", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const date = businessDate();
    const now = new Date();
    const session = await prisma.$transaction(async (tx) => {
      const current = await tx.auctionSession.findUnique({ where: { businessDate: new Date(`${date}T00:00:00Z`) } });
      if (!current) throw Object.assign(new Error("ยังไม่มีรายการประมูลวันนี้ กรุณาบันทึกเวลาเปิด-ปิดก่อน"), { status: 404 });
      await tx.auctionItem.updateMany({
        where: { sessionId: current.id },
        data: { status: "open", startPriceSatang: 0, minIncrementSatang: 25000, currentPriceSatang: 0, leadingUserId: null, winnerUserId: null }
      });
      return tx.auctionSession.update({
        where: { id: current.id },
        data: { opensAt: now, closesAt: new Date(now.getTime() + 60 * 60 * 1000), status: "open" },
        include: { items: { include: { host: true } } }
      });
    });
    res.json(session);
  } catch (error) { next(error); }
});

app.post("/api/auction/admin/close-now", requireAuth, requireRole("admin"), async (_req, res, next) => {
  try {
    const date = businessDate();
    const session = await prisma.auctionSession.update({ where: { businessDate: new Date(`${date}T00:00:00Z`) }, data: { closesAt: new Date(), status: "closed" }, include: { items: { include: { host: true } } } });
    const settlement = await settleAuctionSession(session.id);
    const failed = settlement.filter((result) => result.status === "payment_failed");
    res.json({ session, settlement, warning: failed.length ? "มีรายการที่ Stripe ตัดเงินไม่สำเร็จ" : null });
  } catch (error) { next(error); }
});

app.post("/api/auction/payment-methods/setup-intent", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    if (!stripe) throw Object.assign(new Error("ยังไม่ได้ตั้งค่า Stripe Test Mode"), { status: 503 });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, select: { id: true, email: true, fullName: true, stripeCustomerId: true } });
    const customerId = await ensureStripeCustomer(user);
    const intent = await stripe.setupIntents.create({
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      usage: "off_session",
      metadata: { userId: user.id }
    });
    res.json({ clientSecret: intent.client_secret });
  } catch (error) { next(error); }
});

app.post("/api/auction/payment-methods", requireAuth, validate(setupPaymentMethodSchema), async (req: AuthRequest, res, next) => {
  try {
    if (!stripe) throw Object.assign(new Error("ยังไม่ได้ตั้งค่า Stripe Test Mode"), { status: 503 });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, select: { id: true, email: true, fullName: true, stripeCustomerId: true } });
    const customerId = await ensureStripeCustomer(user);
    const method = await stripe.paymentMethods.retrieve(req.body.paymentMethodId);
    if (method.type !== "card" || typeof method.card === "undefined") throw Object.assign(new Error("รองรับเฉพาะบัตรเครดิต/เดบิต"), { status: 400 });
    if (method.customer && method.customer !== customerId) throw Object.assign(new Error("บัตรนี้ไม่ใช่ของบัญชีนี้"), { status: 403 });
    if (!method.customer) await stripe.paymentMethods.attach(method.id, { customer: customerId });
    const saved = await prisma.$transaction(async (tx) => {
      await tx.paymentMethod.updateMany({ where: { userId: req.user!.id, isDefault: true }, data: { isDefault: false } });
      return tx.paymentMethod.create({ data: { userId: req.user!.id, stripePaymentMethodId: method.id, brand: method.card!.brand, last4: method.card!.last4, expMonth: method.card!.exp_month, expYear: method.card!.exp_year, isDefault: true }, select: { id: true, brand: true, last4: true, expMonth: true, expYear: true, isDefault: true } });
    });
    res.status(201).json(saved);
  } catch (error) { next(error); }
});

app.post("/api/package-orders", requireAuth, validate(packageOrderSchema), async (req: AuthRequest, res, next) => {
  try {
    const selected = await prisma.package.findFirst({ where: { id: req.body.packageId, isActive: true } });
    if (!selected) throw Object.assign(new Error("ไม่พบแพ็กเกจนี้"), { status: 404 });
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.packageOrder.create({ data: { orderCode: `PK-${Date.now()}`, userId: req.user!.id, packageId: selected.id, priceSatang: selected.priceSatang, useDate: req.body.useDate ? new Date(`${req.body.useDate}T00:00:00Z`) : null } });
      const payment = await tx.payment.create({ data: { userId: req.user!.id, purpose: "package", packageOrderId: created.id, method: "card", amountSatang: selected.priceSatang, idempotencyKey: `stripe_package_${created.id}` } });
      return { created, paymentId: payment.id };
    });

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

app.post("/api/payments/checkout", requireAuth, validate(checkoutSchema), async (req: AuthRequest, res, next) => {
  try {
    if (!stripe) throw Object.assign(new Error("ยังไม่ได้ตั้งค่า Stripe"), { status: 503 });
    let payment: { id: string; amountSatang: number; booking?: { bookingCode: string }; packageOrder?: { package: { name: string } } } | null;
    if (req.body.kind === "booking") {
      const found = await prisma.payment.findFirst({ where: { bookingId: req.body.id, userId: req.user!.id, status: "pending" }, include: { booking: true } });
      payment = found ? { id: found.id, amountSatang: found.amountSatang, booking: found.booking ?? undefined } : null;
    } else {
      const found = await prisma.payment.findFirst({ where: { packageOrderId: req.body.id, userId: req.user!.id, status: "pending" }, include: { packageOrder: { include: { package: true } } } });
      payment = found ? { id: found.id, amountSatang: found.amountSatang, packageOrder: found.packageOrder ? { package: { name: found.packageOrder.package.name } } : undefined } : null;
    }
    if (!payment) throw Object.assign(new Error("ไม่พบรายการชำระเงิน"), { status: 404 });
    const name = payment.booking ? `มัดจำโต๊ะ ${payment.booking.bookingCode}` : payment.packageOrder!.package.name;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price_data: { currency: "thb", product_data: { name }, unit_amount: payment.amountSatang }, quantity: 1 }],
      metadata: { paymentId: payment.id, kind: req.body.kind },
      success_url: `${process.env.WEB_ORIGIN ?? "http://localhost:5173"}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.WEB_ORIGIN ?? "http://localhost:5173"}/${req.body.kind === "booking" ? "booking" : "packages"}?payment=cancelled`
    });

    app.get("/api/payments/checkout/confirm", requireAuth, async (req: AuthRequest, res, next) => {
      try {
        if (!stripe) throw Object.assign(new Error("ยังไม่ได้ตั้งค่า Stripe"), { status: 503 });
        const sessionId = String(req.query.session_id ?? "");
        if (!sessionId.startsWith("cs_")) throw Object.assign(new Error("ไม่พบ Checkout Session"), { status: 400 });
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const paymentId = session.metadata?.paymentId;
        if (session.payment_status !== "paid" || !paymentId) throw Object.assign(new Error("การชำระเงินยังไม่ได้รับการยืนยัน"), { status: 409 });
        await prisma.$transaction(async (tx) => {
          const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { booking: true, packageOrder: true } });
          if (!payment || payment.userId !== req.user!.id) throw Object.assign(new Error("ไม่พบรายการชำระเงินของบัญชีนี้"), { status: 404 });
          await tx.payment.update({ where: { id: payment.id }, data: { status: "succeeded", stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null, paidAt: payment.paidAt ?? new Date() } });
          if (payment.booking) {
            await tx.booking.update({ where: { id: payment.booking.id }, data: { status: "confirmed", holdExpiresAt: null } });
            const existingTicket = await tx.eTicket.findUnique({ where: { bookingId: payment.booking.id } });
            if (!existingTicket) await tx.eTicket.create({ data: { ticketCode: `T-${Date.now()}`, qrToken: crypto.randomBytes(16).toString("hex"), userId: payment.userId, ticketType: "table", bookingId: payment.booking.id, validFrom: payment.booking.arrivalAt, validUntil: new Date(payment.booking.arrivalAt.getTime() + 30 * 60000) } });
          }
          if (payment.packageOrder) {
            await tx.packageOrder.update({ where: { id: payment.packageOrder.id }, data: { status: "paid" } });
            const existingTicket = await tx.eTicket.findUnique({ where: { packageOrderId: payment.packageOrder.id } });
            if (!existingTicket) await tx.eTicket.create({ data: { ticketCode: `P-${Date.now()}`, qrToken: crypto.randomBytes(16).toString("hex"), userId: payment.userId, ticketType: "package", packageOrderId: payment.packageOrder.id, validFrom: new Date(), validUntil: new Date(Date.now() + 7 * 86400000) } });
          }
        });
        res.json({ confirmed: true });
      } catch (error) { next(error); }
    });
    await prisma.payment.update({ where: { id: payment.id }, data: { stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null } });
    res.json({ url: session.url });
  } catch (error) { next(error); }
});

app.post("/api/bookings", requireAuth, validate(bookingSchema), async (req: AuthRequest, res, next) => {
  try {
    const input = req.body as any;
    const nowParts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", hour: "2-digit", hour12: false }).formatToParts(new Date());
    const currentHour = Number(nowParts.find((part) => part.type === "hour")?.value);
    const bookingTestMode = process.env.BOOKING_TEST_MODE === "true";
    if (!bookingTestMode && (currentHour < 6 || currentHour >= 20)) throw Object.assign(new Error("ระบบจองเปิดทุกวัน 06:00-20:00"), { status: 400 });
    const arrivalHour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", hour: "2-digit", hour12: false }).formatToParts(new Date(input.arrivalAt)).find((part) => part.type === "hour")?.value);
    if (arrivalHour < 20 && arrivalHour >= 2) throw Object.assign(new Error("เวลาเข้าร้านต้องอยู่ในช่วง 20:00-02:00"), { status: 400 });
    const table = await prisma.venueTable.findUnique({ where: { id: input.tableId } });
    if (!table || !table.isActive) throw Object.assign(new Error("ไม่พบโต๊ะนี้"), { status: 404 });
    const booking = await prisma.booking.create({
      data: {
        bookingCode: `BB-${Date.now()}`,
        userId: req.user!.id,
        tableId: input.tableId,
        businessDate: new Date(`${input.businessDate}T00:00:00Z`),
        partySizeRange: input.partySizeRange,
        guestName: input.guestName,
        arrivalAt: new Date(input.arrivalAt),
        graceUntil: new Date(new Date(input.arrivalAt).getTime() + 15 * 60000),
        specialRequest: input.specialRequest,
        holdExpiresAt: new Date(Date.now() + 15 * 60 * 1000)
      }
    });
    const payment = await prisma.payment.create({ data: { userId: req.user!.id, purpose: "booking_deposit", bookingId: booking.id, method: "card", amountSatang: booking.depositSatang, idempotencyKey: `stripe_booking_${booking.id}` } });
    res.status(201).json({ booking, payment: { amountSatang: booking.depositSatang, status: "pending", paymentId: payment.id } });
  } catch (error) {
    next(error);
  }
});

app.post("/api/bookings/:code/pay", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    if (!stripe) throw Object.assign(new Error("ยังไม่ได้ตั้งค่า Stripe"), { status: 503 });
    const booking = await prisma.booking.findFirst({ where: { bookingCode: String(req.params.code), userId: req.user!.id, status: "pending_payment" } });
    if (!booking) throw Object.assign(new Error("ไม่พบรายการจองหรือรายการนี้ชำระเงินแล้ว"), { status: 404 });
    if (booking.holdExpiresAt && booking.holdExpiresAt < new Date()) throw Object.assign(new Error("เวลาถือโต๊ะหมดอายุแล้ว กรุณาจองใหม่"), { status: 409 });
    res.json({ paymentId: (await prisma.payment.findFirstOrThrow({ where: { bookingId: booking.id } })).id });
  } catch (error) {
    next(error);
  }
});

app.get("/api/tickets", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const tickets = await prisma.eTicket.findMany({
      where: { userId: req.user!.id },
      include: { booking: { include: { table: { include: { zone: true } } } }, packageOrder: { include: { package: true } } },
      orderBy: { createdAt: "desc" }
    });
    const withPayment = await Promise.all(tickets.map(async (ticket) => {
      const payment = await prisma.payment.findFirst({
        where: { userId: req.user!.id, OR: [{ bookingId: ticket.bookingId ?? undefined }, { packageOrderId: ticket.packageOrderId ?? undefined }] },
        orderBy: { paidAt: "desc" },
        select: { amountSatang: true, paidAt: true, status: true }
      });
      return { ...ticket, payment };
    }));
    res.json(withPayment);
  } catch (error) {
    next(error);
  }
});

app.post("/api/auction/items/:id/bids", requireAuth, requireRole("customer", "admin"), validate(bidSchema), async (req: AuthRequest, res, next) => {
  try {
    const item = await prisma.auctionItem.findUnique({ where: { id: Number(req.params.id) }, include: { session: true } });
    if (!item || item.status !== "open" || item.session.status !== "open") throw Object.assign(new Error("การประมูลยังไม่เปิดหรือปิดแล้ว"), { status: 409 });
    const method = await prisma.paymentMethod.findFirst({ where: { id: req.body.paymentMethodId, userId: req.user!.id, detachedAt: null } });
    if (!method) throw Object.assign(new Error("กรุณาผูกบัตรก่อนเข้าประมูล"), { status: 400 });
    const amountSatang = item.currentPriceSatang + req.body.amountDrinks * 25000;
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.auctionItem.updateMany({ where: { id: item.id, status: "open", currentPriceSatang: item.currentPriceSatang }, data: { currentPriceSatang: amountSatang, leadingUserId: req.user!.id } });
      if (!updated.count) throw Object.assign(new Error("มีผู้ประมูลรายอื่นเสนอราคาก่อนหน้า กรุณารีเฟรช"), { status: 409 });
      await tx.bid.create({ data: { auctionItemId: item.id, userId: req.user!.id, paymentMethodId: method.id, amountSatang, termsVersion: "auction-v1", termsAcceptedAt: new Date() } });
      return tx.auctionItem.findUnique({ where: { id: item.id }, include: { host: true } });
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("API Error:", error);
  const status = error.status ?? (error.code === "P2002" ? 409 : 500);
  const message = error.code === "P2002" ? "อีเมล เบอร์โทร หรือ username นี้ถูกใช้แล้ว" : error.message ?? "เกิดข้อผิดพลาดในระบบ";
  res.status(status).json({ error: message });
});

startJobs();

app.listen(4000, () => console.log("API listening on http://localhost:4000"));
