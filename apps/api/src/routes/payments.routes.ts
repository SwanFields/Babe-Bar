import { Router } from "express";
import { checkoutSchema, packageOrderSchema } from "@babe-bar/shared";
import { asyncHandler } from "../lib/errors";
import { requireAuth, validate } from "../middleware";
import { paymentService } from "../services/paymentService";

export const paymentRoutes = Router();

paymentRoutes.post("/package-orders", requireAuth, validate(packageOrderSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await paymentService.createPackageOrder(req.user!.id, req.body));
}));

paymentRoutes.post("/payments/checkout", requireAuth, validate(checkoutSchema), asyncHandler(async (req, res) => {
  res.json(await paymentService.createCheckout(req.user!.id, req.body));
}));

paymentRoutes.get("/payments/checkout/confirm", requireAuth, asyncHandler(async (req, res) => {
  res.json(await paymentService.confirmCheckout(req.user!.id, String(req.query.session_id ?? "")));
}));
