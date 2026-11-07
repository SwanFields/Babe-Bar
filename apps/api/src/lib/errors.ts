import type { NextFunction, Request, RequestHandler, Response } from "express";

/** error ที่ตั้งใจโยนเอง พร้อม HTTP status — error-handler ตัวเดียวแปลงเป็น response */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export type AuthRequest = Request & { user?: { id: string; role: string } };

/** Express 4 ไม่จับ error ของ async handler ให้เอง จึงห่อไว้ให้ ไม่ต้องเขียน try/catch ทุก route */
export const asyncHandler =
  (fn: (req: AuthRequest, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req as AuthRequest, res, next).catch(next);
  };
