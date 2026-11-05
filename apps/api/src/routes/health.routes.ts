import { Router } from "express";
import { asyncHandler } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { businessDate } from "../lib/time";

export const healthRoutes = Router();

healthRoutes.get("/health", asyncHandler(async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`; // ต่อ PostgreSQL ไม่ได้ → error → 500
  res.json({ ok: true, businessDate: businessDate(), database: { type: "postgresql", status: "connected" } });
}));
