import bcrypt from "bcryptjs";
import { Router } from "express";
import { loginSchema, registerSchema } from "@babe-bar/shared";
import { asyncHandler, HttpError } from "../lib/errors";
import { requireAuth, requireRole, validate } from "../middleware";
import { endSession, issueSession, readRefreshCookie, refreshAccessToken } from "../services/authService";
import { userService } from "../services/userService";

export const authRoutes = Router();

authRoutes.post("/auth/register", validate(registerSchema), asyncHandler(async (req, res) => {
  const user = await userService.create({ ...req.body, role: "customer", status: "active" });
  res.status(201).json({ accessToken: await issueSession(res, user), user });
}));

authRoutes.post("/auth/login", validate(loginSchema), asyncHandler(async (req, res) => {
  const found = await userService.findForLogin(req.body.email);
  const passwordOk = found && found.status !== "deleted" && (await bcrypt.compare(req.body.password, found.passwordHash));
  if (!found || !passwordOk) throw new HttpError(401, "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
  if (found.status === "suspended") throw new HttpError(403, "บัญชีนี้ถูกระงับการใช้งานชั่วคราว");

  const user = await userService.getActiveOrThrow(found.id); // ส่งกลับเฉพาะ DTO ไม่มี passwordHash
  res.json({ accessToken: await issueSession(res, user), user });
}));

// แอดมินสลับไปใช้บัญชีอื่นเพื่อทดสอบ
authRoutes.post("/auth/switch-account/:id", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const user = await userService.getActiveOrThrow(String(req.params.id));
  res.json({ accessToken: await issueSession(res, user), user });
}));

authRoutes.post("/auth/refresh", asyncHandler(async (req, res) => {
  const token = await refreshAccessToken(readRefreshCookie(req.cookies));
  if (!token) throw new HttpError(401, "เซสชันหมดอายุ");
  res.json({ accessToken: token });
}));

authRoutes.post("/auth/logout", asyncHandler(async (req, res) => {
  await endSession(res, readRefreshCookie(req.cookies));
  res.status(204).end();
}));
