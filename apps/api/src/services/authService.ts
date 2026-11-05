import type { Response } from "express";
import { accessToken, hashToken, randomToken } from "../lib/auth";
import { prisma } from "../lib/prisma";

const REFRESH_DAYS = 30;
const REFRESH_MS = REFRESH_DAYS * 86_400_000;
const COOKIE = "refresh_token";

/** สร้าง refresh session (เก็บเฉพาะ hash ใน DB) + ตั้ง cookie httpOnly แล้วคืน access token อายุสั้น */
export async function issueSession(res: Response, user: { id: string; role: string }) {
  const refresh = randomToken();
  await prisma.refreshSession.create({ data: { userId: user.id, tokenHash: hashToken(refresh), expiresAt: new Date(Date.now() + REFRESH_MS) } });
  res.cookie(COOKIE, refresh, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: REFRESH_MS });
  return accessToken(user.id, user.role);
}

/** แลก refresh token (จาก cookie) เป็น access token ใหม่ ถ้าไม่ถูกต้อง/หมดอายุคืน null */
export async function refreshAccessToken(refresh: string | undefined) {
  if (!refresh) return null;
  const session = await prisma.refreshSession.findFirst({
    where: { tokenHash: hashToken(refresh), revokedAt: null, expiresAt: { gt: new Date() }, user: { status: "active" } },
    include: { user: true }
  });
  return session ? accessToken(session.user.id, session.user.role) : null;
}

export async function endSession(res: Response, refresh: string | undefined) {
  if (refresh) await prisma.refreshSession.updateMany({ where: { tokenHash: hashToken(refresh) }, data: { revokedAt: new Date() } });
  res.clearCookie(COOKIE);
}

export const readRefreshCookie = (cookies: Record<string, string> | undefined) => cookies?.[COOKIE];
