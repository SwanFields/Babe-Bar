import { PrismaClient } from "@prisma/client";

// สร้าง PrismaClient ที่เดียวทั้งแอป (หลาย instance = หลาย connection pool)
export const prisma = new PrismaClient();
