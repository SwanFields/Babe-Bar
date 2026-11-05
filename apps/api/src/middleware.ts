import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";
import multer from "multer";
import type { ZodSchema } from "zod";
import { verifyAccess } from "./lib/auth";
import { AuthRequest, HttpError } from "./lib/errors";

/** ตรวจ body/query/params ด้วย Zod ก่อนถึง handler (ไม่เชื่อข้อมูลจาก client) */
export const validate =
  (schema: ZodSchema, source: "body" | "query" | "params" = "body"): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(new HttpError(400, result.error.issues.map((i) => i.message).join(", ")));
    req[source] = result.data;
    next();
  };

export const requireAuth: RequestHandler = (req: Request, _res, next) => {
  const header = req.headers.authorization;
  try {
    if (!header?.startsWith("Bearer ")) throw new Error("missing token");
    const payload = verifyAccess(header.slice(7));
    (req as AuthRequest).user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new HttpError(401, "กรุณาเข้าสู่ระบบ"));
  }
};

export const requireRole =
  (...roles: string[]): RequestHandler =>
  (req, _res, next) => {
    const user = (req as AuthRequest).user;
    next(user && roles.includes(user.role) ? undefined : new HttpError(403, "ไม่มีสิทธิ์ใช้งาน"));
  };

export const notFound: RequestHandler = (_req, _res, next) => next(new HttpError(404, "ไม่พบเส้นทางนี้"));

/** ที่เดียวในระบบที่แปลง error เป็น HTTP response ทุกตัวตอบรูปเดียวกัน { error: "ข้อความ" } */
export const errorHandler: ErrorRequestHandler = (error, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) return void res.status(error.status).json({ error: error.message });
  if (error instanceof multer.MulterError) return void res.status(400).json({ error: "รองรับไฟล์ JPG, PNG หรือ WEBP ขนาดไม่เกิน 3MB" });

  // รหัส error ของ Prisma
  if (error?.code === "P2002") return void res.status(409).json({ error: "ข้อมูลนี้ถูกใช้แล้ว (อีเมล เบอร์โทร หรือ username)" });
  if (error?.code === "P2025") return void res.status(404).json({ error: "ไม่พบข้อมูลที่ต้องการ" });
  if (error?.code === "P2034") return void res.status(409).json({ error: "มีผู้ใช้อื่นทำรายการพร้อมกัน กรุณาลองใหม่" });

  console.error("API Error:", error);
  res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
};
