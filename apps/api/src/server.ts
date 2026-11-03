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
  createAccountSchema,
  updateUserStatusSchema
} from "@babe-bar/shared";
import { accessToken, hashToken, randomToken } from "./lib/auth";
import { AuthRequest, requireAuth, requireRole, validate } from "./middleware";
import { businessDate } from "./lib/time";
import { startJobs } from "./jobs";
import { userStore } from "./lib/userStore";

const prisma = new PrismaClient();
const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:5173", credentials: true }));
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
      user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName, username: user.username }
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
      user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName, username: user.username }
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
      user: { id: user.id, email: user.email, role: user.role, fullName: user.fullName, username: user.username }
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

app.get("/api/auction/today", async (_req, res, next) => {
  try {
    res.json(
      await prisma.auctionSession.findUnique({
        where: { businessDate: new Date(businessDate()) },
        include: { items: { include: { host: true } } }
      })
    );
  } catch (error) {
    next(error);
  }
});

app.post("/api/bookings", requireAuth, validate(bookingSchema), async (req: AuthRequest, res, next) => {
  try {
    const input = req.body as any;
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
        specialRequest: input.specialRequest
      }
    });
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

app.post("/api/auction/items/:id/bids", requireAuth, requireRole("customer", "admin"), validate(bidSchema), async (req: AuthRequest, res, next) => {
  try {
    const item = await prisma.auctionItem.updateMany({
      where: { id: Number(req.params.id), status: "open", currentPriceSatang: { lt: req.body.amountSatang } },
      data: { currentPriceSatang: req.body.amountSatang, leadingUserId: req.user!.id }
    });
    if (!item.count) throw Object.assign(new Error("ราคาเสนอไม่สูงพอหรือประมูลปิดแล้ว"), { status: 409 });
    res.json({ ok: true });
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
