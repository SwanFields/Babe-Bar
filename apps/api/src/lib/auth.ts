import jwt from "jsonwebtoken";
import crypto from "node:crypto";
const secret = process.env.JWT_SECRET ?? "development-secret";
export const accessToken = (userId: string, role: string) => jwt.sign({ sub: userId, role }, secret, { expiresIn: "15m" });
export const verifyAccess = (token: string) => jwt.verify(token, secret) as { sub: string; role: string };
export const randomToken = () => crypto.randomBytes(32).toString("hex");
export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
