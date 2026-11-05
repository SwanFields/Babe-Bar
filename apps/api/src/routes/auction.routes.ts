import { Router } from "express";
import { auctionScheduleSchema, bidSchema, setupPaymentMethodSchema } from "@babe-bar/shared";
import { asyncHandler } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, validate } from "../middleware";
import { auctionService } from "../services/auctionService";
import { paymentMethodService } from "../services/paymentMethodService";

export const auctionRoutes = Router();

// ----- สาธารณะ / ลูกค้า -----
auctionRoutes.get("/auction/today", asyncHandler(async (_req, res) => {
  res.json(await auctionService.today());
}));

auctionRoutes.get("/auction/customer-drips", requireAuth, asyncHandler(async (req, res) => {
  res.json(await auctionService.customerDrips(req.user!.id));
}));

auctionRoutes.post("/auction/items/:id/bids", requireAuth, requireRole("customer", "admin"), validate(bidSchema), asyncHandler(async (req, res) => {
  res.json(await auctionService.placeBid(req.user!.id, Number(req.params.id), req.body));
}));

// ----- บัตรสำหรับประมูล -----
auctionRoutes.get("/auction/payment-methods", requireAuth, asyncHandler(async (req, res) => {
  res.json(await paymentMethodService.list(req.user!.id));
}));

auctionRoutes.post("/auction/payment-methods/setup-intent", requireAuth, asyncHandler(async (req, res) => {
  res.json(await paymentMethodService.createSetupIntent(req.user!.id));
}));

auctionRoutes.post("/auction/payment-methods", requireAuth, validate(setupPaymentMethodSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await paymentMethodService.save(req.user!.id, req.body.paymentMethodId));
}));

// ----- แอดมิน -----
auctionRoutes.use("/auction/admin", requireAuth, requireRole("admin"));

auctionRoutes.get("/auction/admin/hosts", asyncHandler(async (_req, res) => {
  res.json(await prisma.host.findMany({ where: { isActive: true }, orderBy: { id: "asc" } }));
}));

auctionRoutes.post("/auction/admin/schedule", validate(auctionScheduleSchema), asyncHandler(async (req, res) => {
  res.json(await auctionService.schedule(req.body));
}));

auctionRoutes.post("/auction/admin/open-now", asyncHandler(async (_req, res) => {
  res.json(await auctionService.openNow());
}));

auctionRoutes.post("/auction/admin/close-now", asyncHandler(async (_req, res) => {
  res.json(await auctionService.closeNow());
}));
