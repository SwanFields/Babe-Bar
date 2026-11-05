import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { uploadRoot } from "./lib/uploads";
import { errorHandler, notFound } from "./middleware";
import { adminRoutes } from "./routes/admin.routes";
import { auctionRoutes } from "./routes/auction.routes";
import { authRoutes } from "./routes/auth.routes";
import { bookingRoutes } from "./routes/booking.routes";
import { catalogRoutes } from "./routes/catalog.routes";
import { healthRoutes } from "./routes/health.routes";
import { paymentRoutes } from "./routes/payments.routes";
import { ticketRoutes } from "./routes/tickets.routes";
import { userRoutes } from "./routes/users.routes";
import { webhookRoutes } from "./routes/webhooks.routes";

export const app = express();

/* ---------- 1) middleware ที่ทุกคำขอต้องผ่าน (ลำดับสำคัญ) ---------- */
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:5173", credentials: true })); // credentials: เพื่อส่ง cookie refresh token
app.use("/uploads", express.static(uploadRoot));

// webhook ต้องมาก่อน express.json() เพราะต้องใช้ body ดิบตรวจลายเซ็น Stripe
app.use("/api/webhooks", webhookRoutes);

app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", rateLimit({ windowMs: 60_000, limit: 30 })); // กัน brute force

/* ---------- 2) กลุ่มเส้นทาง ---------- */
app.use("/api", healthRoutes, authRoutes, userRoutes, catalogRoutes, adminRoutes, bookingRoutes, paymentRoutes, ticketRoutes, auctionRoutes);

/* ---------- 3) ท้ายสุด: 404 แล้วตามด้วย error handler ---------- */
app.use(notFound);
app.use(errorHandler);
