import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { verifyAccess } from "./lib/auth";
export type AuthRequest = Request & { user?: { id: string; role: string } };
export const validate = (schema: ZodSchema, source: "body" | "query" | "params" = "body") => (req: Request, _res: Response, next: NextFunction) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) return next(Object.assign(new Error(result.error.issues.map((i) => i.message).join(", ")), { status: 400 }));
  req[source] = result.data;
  next();
};
export const requireAuth = (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new Error("กรุณาเข้าสู่ระบบ");
    const payload = verifyAccess(header.slice(7));
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch { next(Object.assign(new Error("กรุณาเข้าสู่ระบบ"), { status: 401 })); }
};
export const requireRole = (...roles: string[]) => (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) return next(Object.assign(new Error("ไม่มีสิทธิ์ใช้งาน"), { status: 403 }));
  next();
};