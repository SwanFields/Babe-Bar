import { Router } from "express";
import { createAccountSchema, updateProfileSchema, updateUserStatusSchema } from "@babe-bar/shared";
import { asyncHandler, HttpError } from "../lib/errors";
import { requireAuth, requireRole, validate } from "../middleware";
import { endSession, readRefreshCookie } from "../services/authService";
import { userService } from "../services/userService";

export const userRoutes = Router();
// ทุกเส้นใน /me และ /users ต้องล็อกอิน (ระบุ path ไว้ เพื่อไม่ให้กระทบ route สาธารณะของ router อื่น)
userRoutes.use(["/me", "/users"], requireAuth);

// ----- บัญชีของตัวเอง -----
userRoutes.get("/me", asyncHandler(async (req, res) => {
  res.json(await userService.getActiveOrThrow(req.user!.id));
}));

// แก้ได้เฉพาะ ชื่อ/เบอร์/username/อีเมล — schema เป็น strict จึงแก้ role/status ผ่านทางนี้ไม่ได้
userRoutes.patch("/me", validate(updateProfileSchema), asyncHandler(async (req, res) => {
  await userService.getActiveOrThrow(req.user!.id);
  res.json(await userService.updateProfile(req.user!.id, req.body));
}));

userRoutes.delete("/me", asyncHandler(async (req, res) => {
  if (req.user!.role === "admin") throw new HttpError(403, "บัญชีผู้ดูแลระบบไม่สามารถปิดเองได้");
  await userService.close(req.user!.id);
  await endSession(res, readRefreshCookie(req.cookies));
  res.status(204).end();
}));

// ----- จัดการผู้ใช้ -----
// admin เห็นทั้งหมด, คนอื่นเห็นเฉพาะตัวเอง (หน้า dashboard อ่านค่า source)
userRoutes.get("/users", asyncHandler(async (req, res) => {
  const users = req.user!.role === "admin" ? await userService.list() : [await userService.getById(req.user!.id)].filter((u) => u && u.status !== "deleted");
  res.json({ total: users.length, source: "prisma", users });
}));

userRoutes.get("/users/:id", asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  if (req.user!.role !== "admin" && req.user!.id !== id) throw new HttpError(403, "ไม่มีสิทธิ์ใช้งาน");
  const user = await userService.getById(id);
  if (!user) throw new HttpError(404, "ไม่พบบัญชีผู้ใช้นี้");
  res.json(user);
}));

userRoutes.post("/users", requireRole("admin"), validate(createAccountSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await userService.create(req.body));
}));

userRoutes.patch("/users/:id", requireRole("admin"), validate(updateUserStatusSchema), asyncHandler(async (req, res) => {
  res.json(await userService.updateStatusAndRole(String(req.params.id), req.body));
}));

// ปิดบัญชีลูกค้า: ลบได้เฉพาะ customer และลบตัวเองไม่ได้
userRoutes.delete("/users/:id", requireRole("admin"), asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  if (id === req.user!.id) throw new HttpError(400, "ไม่สามารถลบบัญชีของตัวเองได้");
  const target = await userService.getById(id);
  if (!target) throw new HttpError(404, "ไม่พบบัญชีผู้ใช้นี้");
  if (target.role !== "customer") throw new HttpError(403, "ลบได้เฉพาะบัญชีลูกค้า");
  await userService.close(id);
  res.status(204).end();
}));
