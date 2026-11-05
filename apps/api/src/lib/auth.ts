import jwt from "jsonwebtoken";
import crypto from "node:crypto";

function loadSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production") throw new Error("ต้องตั้งค่า JWT_SECRET ใน production");
  return "development-secret";
}
const secret = loadSecret();

export const accessToken = (userId: string, role: string) => jwt.sign({ sub: userId, role }, secret, { expiresIn: "15m" });
export const verifyAccess = (token: string) => jwt.verify(token, secret) as { sub: string; role: string };
export const randomToken = () => crypto.randomBytes(32).toString("hex");
export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
