import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import type { CreateAccountInput, RegisterInput, Role, UpdateProfileInput, UserProfileDto, UserStatus } from "@babe-bar/shared";
import { HttpError } from "../lib/errors";
import { prisma } from "../lib/prisma";

const MIN_AGE = 20;
const withCounts = { _count: { select: { bookings: true, bids: true, tickets: true, packageOrders: true, consents: true } } } satisfies Prisma.UserInclude;
type UserWithCounts = Prisma.UserGetPayload<{ include: typeof withCounts }>;

function calculateAge(birth: Date): number {
  const now = new Date();
  const hadBirthday = now.getMonth() > birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  return now.getFullYear() - birth.getFullYear() - (hadBirthday ? 0 : 1);
}

/** แปลงแถวจากฐานข้อมูลเป็นข้อมูลที่ส่งให้ client (ไม่มี passwordHash) */
function toDto(u: UserWithCounts): UserProfileDto {
  const iso = (d: Date | null) => (d ? d.toISOString() : null);
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    fullName: u.fullName,
    phone: u.phone,
    birthDate: u.birthDate.toISOString(),
    age: calculateAge(u.birthDate),
    role: u.role as Role,
    status: u.status as UserStatus,
    emailVerifiedAt: iso(u.emailVerifiedAt),
    stripeCustomerId: u.stripeCustomerId,
    auctionBannedUntil: iso(u.auctionBannedUntil),
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    activity: { ...u._count }
  };
}

const normalize = {
  email: (v: string) => v.toLowerCase().trim(),
  username: (v: string) => v.toLowerCase().trim()
};

export const userService = {
  async list() {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" }, include: withCounts });
    return users.map(toDto);
  },

  async getById(id: string) {
    const user = await prisma.user.findUnique({ where: { id }, include: withCounts });
    return user ? toDto(user) : null;
  },

  /** ดึงโปรไฟล์ที่ต้องมีอยู่และยังไม่ถูกปิดบัญชี ไม่เช่นนั้นโยน 404 */
  async getActiveOrThrow(id: string) {
    const user = await this.getById(id);
    if (!user || user.status === "deleted") throw new HttpError(404, "ไม่พบบัญชีผู้ใช้นี้");
    return user;
  },

  /** สำหรับล็อกอินเท่านั้น: คืนแถวดิบที่มี passwordHash */
  findForLogin(identifier: string) {
    const value = identifier.toLowerCase().trim();
    return prisma.user.findFirst({ where: { OR: [{ email: value }, { username: value }] } });
  },

  async create(input: (RegisterInput | CreateAccountInput) & { role?: Role; status?: UserStatus }) {
    const birthDate = new Date(input.birthDate);
    if (calculateAge(birthDate) < MIN_AGE) throw new HttpError(400, `ต้องมีอายุอย่างน้อย ${MIN_AGE} ปีบริบูรณ์`);
    const user = await prisma.user.create({
      data: {
        email: normalize.email(input.email),
        passwordHash: await bcrypt.hash(input.password, 12),
        fullName: input.fullName.trim(),
        phone: input.phone.trim(),
        username: normalize.username(input.username),
        birthDate,
        role: input.role ?? "customer",
        status: input.status ?? "active",
        consents: { create: ["terms", "privacy", "age_20_plus"].map((consentType) => ({ consentType, documentVersion: "v1" })) }
      },
      include: withCounts
    });
    return toDto(user);
  },

  async updateStatusAndRole(id: string, data: { status?: UserStatus; role?: Role }) {
    return toDto(await prisma.user.update({ where: { id }, data, include: withCounts }));
  },

  async updateProfile(id: string, data: UpdateProfileInput) {
    const clean = {
      fullName: data.fullName?.trim(),
      phone: data.phone?.trim(),
      username: data.username && normalize.username(data.username),
      email: data.email && normalize.email(data.email)
    };
    return toDto(await prisma.user.update({ where: { id }, data: clean, include: withCounts }));
  },

  /** ปิดบัญชีแบบ soft-delete: เก็บประวัติการจอง/ชำระเงินไว้ แต่ล็อกอินไม่ได้อีก */
  async close(id: string) {
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { status: "deleted", deletedAt: new Date() } }),
      prisma.refreshSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } })
    ]);
  }
};
