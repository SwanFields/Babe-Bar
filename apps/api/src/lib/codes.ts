import crypto from "node:crypto";

/** รหัสอ่านง่ายที่ไม่ซ้ำแม้สร้างในมิลลิวินาทีเดียวกัน เช่น BB-1730800000000a1b2 */
export const makeCode = (prefix: string) => `${prefix}-${Date.now()}${crypto.randomBytes(2).toString("hex")}`;
export const makeQrToken = () => crypto.randomBytes(16).toString("hex");
