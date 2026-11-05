import { Router } from "express";
import { redeemTicketSchema } from "@babe-bar/shared";
import { asyncHandler } from "../lib/errors";
import { requireAuth, requireRole, validate } from "../middleware";
import { ticketService } from "../services/ticketService";

export const ticketRoutes = Router();

ticketRoutes.get("/tickets", requireAuth, asyncHandler(async (req, res) => {
  res.json(await ticketService.listForUser(req.user!.id));
}));

ticketRoutes.post("/tickets/redeem", requireAuth, requireRole("staff", "admin"), validate(redeemTicketSchema), asyncHandler(async (req, res) => {
  const ticket = await ticketService.redeem(req.body.ticketCode, req.user!.id);
  res.json({ message: "ยืนยันการใช้ Ticket สำเร็จ", ticket });
}));
