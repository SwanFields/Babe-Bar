import fs from "node:fs";
import path from "node:path";
import type { RequestHandler } from "express";
import { Router } from "express";
import { hostCreateSchema, hostUpdateSchema } from "@babe-bar/shared";
import { asyncHandler, HttpError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { deleteMenuImages, getMenuImageUrl, hostUpload, isMenuCategory, menuUpload } from "../lib/uploads";
import { requireAuth, requireRole, validate } from "../middleware";

/** เครื่องมือแอดมิน: จัดการโฮสต์และรูปเมนู */
export const adminRoutes = Router();
adminRoutes.use("/admin", requireAuth, requireRole("admin"));

const parseHostId = (value: unknown) => {
  const id = Number(value);
  if (!Number.isInteger(id)) throw new HttpError(400, "รหัสโฮสต์ไม่ถูกต้อง");
  return id;
};
const checkMenuCategory: RequestHandler = (req, _res, next) =>
  next(isMenuCategory(req.params.category) ? undefined : new HttpError(400, "หมวดหมู่เมนูไม่ถูกต้อง"));

// ----- โฮสต์ -----
adminRoutes.get("/admin/hosts", asyncHandler(async (_req, res) => {
  res.json(await prisma.host.findMany({ orderBy: { id: "asc" } }));
}));

adminRoutes.post("/admin/hosts", validate(hostCreateSchema), asyncHandler(async (req, res) => {
  res.status(201).json(await prisma.host.create({ data: { ...req.body, bio: req.body.bio || null } }));
}));

adminRoutes.patch("/admin/hosts/:id", validate(hostUpdateSchema), asyncHandler(async (req, res) => {
  const data = { ...req.body };
  if ("bio" in data) data.bio = data.bio || null; // ข้อความว่าง = ล้างประวัติ
  res.json(await prisma.host.update({ where: { id: parseHostId(req.params.id) }, data }));
}));

adminRoutes.post("/admin/hosts/:id/photo", hostUpload.single("photo"), asyncHandler(async (req, res) => {
  const file = req.file;
  try {
    if (!file) throw new HttpError(400, "รองรับเฉพาะ JPG, PNG หรือ WEBP ขนาดไม่เกิน 3MB");
    const id = parseHostId(req.params.id);
    res.json(await prisma.host.update({ where: { id }, data: { photoUrl: `/uploads/hosts/${file.filename}` } }));
  } catch (error) {
    if (file) await fs.promises.unlink(file.path).catch(() => undefined); // ไม่เก็บไฟล์ที่ไม่ได้ใช้
    throw error;
  }
}));

// ----- รูปเมนู -----
adminRoutes.post("/admin/menu/:category/image", checkMenuCategory, menuUpload.single("photo"), asyncHandler(async (req, res) => {
  const category = req.params.category;
  if (!req.file || !isMenuCategory(category)) throw new HttpError(400, "กรุณาเลือกไฟล์ JPG, PNG หรือ WEBP ขนาดไม่เกิน 3MB");
  await deleteMenuImages(category, path.basename(req.file.filename)); // เก็บเฉพาะรูปใหม่
  res.json({ imageUrl: await getMenuImageUrl(category) });
}));

adminRoutes.delete("/admin/menu/:category/image", checkMenuCategory, asyncHandler(async (req, res) => {
  await deleteMenuImages(req.params.category as "food" | "drinks");
  res.json({ imageUrl: "" });
}));
