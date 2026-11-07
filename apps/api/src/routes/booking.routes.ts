import { Router } from "express";
import { bookingSchema } from "@babe-bar/shared";
import { asyncHandler } from "../lib/errors";
import { businessDate } from "../lib/time";
import { requireAuth, validate } from "../middleware";
import { bookingService } from "../services/bookingService";

export const bookingRoutes = Router();

bookingRoutes.get("/booking/availability", asyncHandler(async (req, res) => {
  res.json(await bookingService.availability(String(req.query.businessDate ?? businessDate())));
}));

bookingRoutes.post("/bookings", requireAuth, validate(bookingSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await bookingService.create(req.user!.id, req.body));
}));

bookingRoutes.post("/bookings/:code/pay", requireAuth, asyncHandler(async (req, res) => {
  res.json({ paymentId: await bookingService.paymentIdForBooking(req.user!.id, String(req.params.code)) });
}));
