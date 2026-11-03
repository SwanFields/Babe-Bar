import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import net from "node:net";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import type { CreateAccountInput, RegisterInput, Role, UserProfileDto, UserStatus as SharedUserStatus } from "@babe-bar/shared";

function checkTcpPort(port = 5432, host = "127.0.0.1", timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
    try {
      socket.connect(port, host);
    } catch {
      resolve(false);
    }
  });
}

const dataDir = path.resolve(__dirname, "../../data");
const localStorePath = path.join(dataDir, "users-store.json");

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string;
  username: string;
  birthDate: string;
  role: Role;
  status: SharedUserStatus;
  emailVerifiedAt: string | null;
  stripeCustomerId: string | null;
  auctionBannedUntil: string | null;
  createdAt: string;
  updatedAt: string;
  activity: {
    bookings: number;
    bids: number;
    tickets: number;
    packageOrders: number;
    consents: number;
  };
  consents?: Array<{ consentType: string; documentVersion: string; acceptedAt: string }>;
}

function calculateAge(birthDate: Date | string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Initial sample profiles for rich dashboard presentation and testing
function getInitialSampleUsers(): StoredUser[] {
  const hash = bcrypt.hashSync("BabeBar2026!", 10);
  const adminHash = bcrypt.hashSync("Admin1234!", 10);

  return [
    {
      id: "11111111-1111-4111-8111-111111111111",
      email: "admin@babebar.local",
      passwordHash: adminHash,
      fullName: "Babe Bar Super Admin",
      phone: "0800000000",
      username: "admin",
      birthDate: "1992-04-15T00:00:00.000Z",
      role: "admin",
      status: "active",
      emailVerifiedAt: "2026-01-10T12:00:00.000Z",
      stripeCustomerId: "cus_admin_001",
      auctionBannedUntil: null,
      createdAt: "2026-01-01T20:00:00.000Z",
      updatedAt: "2026-11-03T18:00:00.000Z",
      activity: { bookings: 12, bids: 35, tickets: 8, packageOrders: 5, consents: 3 },
      consents: [
        { consentType: "terms", documentVersion: "v1", acceptedAt: "2026-01-01T20:00:00.000Z" },
        { consentType: "privacy", documentVersion: "v1", acceptedAt: "2026-01-01T20:00:00.000Z" },
        { consentType: "age_20_plus", documentVersion: "v1", acceptedAt: "2026-01-01T20:00:00.000Z" }
      ]
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      email: "staff.luna@babebar.local",
      passwordHash: hash,
      fullName: "Luna Supervisor (ลูน่า)",
      phone: "0812345678",
      username: "luna_staff",
      birthDate: "1997-08-22T00:00:00.000Z",
      role: "staff",
      status: "active",
      emailVerifiedAt: "2026-02-14T10:00:00.000Z",
      stripeCustomerId: null,
      auctionBannedUntil: null,
      createdAt: "2026-02-01T15:30:00.000Z",
      updatedAt: "2026-10-25T11:20:00.000Z",
      activity: { bookings: 0, bids: 0, tickets: 0, packageOrders: 0, consents: 3 },
      consents: [
        { consentType: "terms", documentVersion: "v1", acceptedAt: "2026-02-01T15:30:00.000Z" },
        { consentType: "privacy", documentVersion: "v1", acceptedAt: "2026-02-01T15:30:00.000Z" },
        { consentType: "age_20_plus", documentVersion: "v1", acceptedAt: "2026-02-01T15:30:00.000Z" }
      ]
    },
    {
      id: "33333333-3333-4333-8333-333333333333",
      email: "vip.somchai@gmail.com",
      passwordHash: hash,
      fullName: "คุณสมชาย ใจดี (VIP Platinum)",
      phone: "0898765432",
      username: "somchai_vip",
      birthDate: "1995-11-05T00:00:00.000Z",
      role: "customer",
      status: "active",
      emailVerifiedAt: "2026-03-01T09:15:00.000Z",
      stripeCustomerId: "cus_somchai_vip_99",
      auctionBannedUntil: null,
      createdAt: "2026-03-01T09:00:00.000Z",
      updatedAt: "2026-11-02T22:15:00.000Z",
      activity: { bookings: 14, bids: 42, tickets: 6, packageOrders: 4, consents: 3 },
      consents: [
        { consentType: "terms", documentVersion: "v1", acceptedAt: "2026-03-01T09:00:00.000Z" },
        { consentType: "privacy", documentVersion: "v1", acceptedAt: "2026-03-01T09:00:00.000Z" },
        { consentType: "age_20_plus", documentVersion: "v1", acceptedAt: "2026-03-01T09:00:00.000Z" }
      ]
    },
    {
      id: "44444444-4444-4444-8444-444444444444",
      email: "ploy.babe@gmail.com",
      passwordHash: hash,
      fullName: "พลอยไพลิน พรภิรมย์",
      phone: "0865551234",
      username: "ploy_cute",
      birthDate: "2001-03-18T00:00:00.000Z",
      role: "customer",
      status: "active",
      emailVerifiedAt: "2026-05-19T14:22:00.000Z",
      stripeCustomerId: "cus_ploy_442",
      auctionBannedUntil: null,
      createdAt: "2026-05-19T14:00:00.000Z",
      updatedAt: "2026-10-30T19:40:00.000Z",
      activity: { bookings: 5, bids: 18, tickets: 3, packageOrders: 2, consents: 3 },
      consents: [
        { consentType: "terms", documentVersion: "v1", acceptedAt: "2026-05-19T14:00:00.000Z" },
        { consentType: "privacy", documentVersion: "v1", acceptedAt: "2026-05-19T14:00:00.000Z" },
        { consentType: "age_20_plus", documentVersion: "v1", acceptedAt: "2026-05-19T14:00:00.000Z" }
      ]
    },
    {
      id: "55555555-5555-4555-8555-555555555555",
      email: "john.nightowl@yahoo.com",
      passwordHash: hash,
      fullName: "Johnathan Nightowl",
      phone: "0823334444",
      username: "johnny_night",
      birthDate: "1994-07-07T00:00:00.000Z",
      role: "customer",
      status: "suspended",
      emailVerifiedAt: null,
      stripeCustomerId: null,
      auctionBannedUntil: "2026-12-31T23:59:59.000Z",
      createdAt: "2026-07-12T18:45:00.000Z",
      updatedAt: "2026-10-15T16:00:00.000Z",
      activity: { bookings: 1, bids: 3, tickets: 0, packageOrders: 0, consents: 3 },
      consents: [
        { consentType: "terms", documentVersion: "v1", acceptedAt: "2026-07-12T18:45:00.000Z" },
        { consentType: "privacy", documentVersion: "v1", acceptedAt: "2026-07-12T18:45:00.000Z" },
        { consentType: "age_20_plus", documentVersion: "v1", acceptedAt: "2026-07-12T18:45:00.000Z" }
      ]
    }
  ];
}

class UserStoreManager {
  private localUsers: StoredUser[] = [];
  private prismaAvailable: boolean | null = null;
  private lastPrismaCheck = 0;

  constructor() {
    this.ensureDataFile();
  }

  private ensureDataFile() {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (fs.existsSync(localStorePath)) {
        const raw = fs.readFileSync(localStorePath, "utf-8");
        this.localUsers = JSON.parse(raw);
      } else {
        this.localUsers = getInitialSampleUsers();
        this.saveLocalFile();
      }
    } catch {
      this.localUsers = getInitialSampleUsers();
    }
  }

  private saveLocalFile() {
    try {
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(localStorePath, JSON.stringify(this.localUsers, null, 2), "utf-8");
    } catch (e) {
      console.warn("Failed to persist local users file:", e);
    }
  }

  async isPrismaAvailable(prisma: PrismaClient): Promise<boolean> {
    const now = Date.now();
    // Cache check for 15 seconds to avoid repeated connection attempts
    if (this.prismaAvailable !== null && now - this.lastPrismaCheck < 15000) {
      return this.prismaAvailable;
    }
    this.lastPrismaCheck = now;
    
    // Quick TCP probe to avoid 30s Prisma client connection timeout if PostgreSQL is offline
    const isPortOpen = await checkTcpPort(5432, "127.0.0.1", 600);
    if (!isPortOpen) {
      this.prismaAvailable = false;
      return false;
    }

    try {
      await prisma.$queryRaw`SELECT 1`;
      this.prismaAvailable = true;
      return true;
    } catch {
      this.prismaAvailable = false;
      return false;
    }
  }

  formatUserDto(u: {
    id: string;
    email: string;
    fullName: string;
    username: string;
    phone: string;
    birthDate: Date | string;
    role: string;
    status: string;
    emailVerifiedAt?: Date | string | null;
    stripeCustomerId?: string | null;
    auctionBannedUntil?: Date | string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
    _count?: {
      bookings?: number;
      bids?: number;
      tickets?: number;
      packageOrders?: number;
      consents?: number;
    };
    activity?: {
      bookings: number;
      bids: number;
      tickets: number;
      packageOrders: number;
      consents: number;
    };
  }): UserProfileDto {
    const birth = new Date(u.birthDate);
    return {
      id: u.id,
      email: u.email,
      username: u.username,
      fullName: u.fullName,
      phone: u.phone,
      birthDate: birth.toISOString(),
      age: calculateAge(birth),
      role: u.role as Role,
      status: (u.status ?? "active") as SharedUserStatus,
      emailVerifiedAt: u.emailVerifiedAt ? new Date(u.emailVerifiedAt).toISOString() : null,
      stripeCustomerId: u.stripeCustomerId ?? null,
      auctionBannedUntil: u.auctionBannedUntil ? new Date(u.auctionBannedUntil).toISOString() : null,
      createdAt: new Date(u.createdAt).toISOString(),
      updatedAt: new Date(u.updatedAt).toISOString(),
      activity: {
        bookings: u.activity?.bookings ?? u._count?.bookings ?? 0,
        bids: u.activity?.bids ?? u._count?.bids ?? 0,
        tickets: u.activity?.tickets ?? u._count?.tickets ?? 0,
        packageOrders: u.activity?.packageOrders ?? u._count?.packageOrders ?? 0,
        consents: u.activity?.consents ?? u._count?.consents ?? 3
      }
    };
  }

  async getAllUsers(prisma: PrismaClient): Promise<{ users: UserProfileDto[]; source: "prisma" | "local" }> {
    const ready = await this.isPrismaAvailable(prisma);
    if (ready) {
      try {
        const users = await prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            _count: {
              select: {
                bookings: true,
                bids: true,
                tickets: true,
                packageOrders: true,
                consents: true
              }
            }
          }
        });
        return {
          users: users.map((u) => this.formatUserDto(u)),
          source: "prisma"
        };
      } catch (e) {
        console.warn("Prisma error, falling back to local users:", e);
      }
    }

    // Fallback: local store
    this.ensureDataFile();
    return {
      users: this.localUsers.map((u) => this.formatUserDto(u)),
      source: "local"
    };
  }

  async getUserById(prisma: PrismaClient, id: string): Promise<UserProfileDto | null> {
    const ready = await this.isPrismaAvailable(prisma);
    if (ready) {
      try {
        const user = await prisma.user.findUnique({
          where: { id },
          include: {
            _count: {
              select: {
                bookings: true,
                bids: true,
                tickets: true,
                packageOrders: true,
                consents: true
              }
            }
          }
        });
        if (user) return this.formatUserDto(user);
      } catch (e) {
        console.warn("Prisma error in getUserById:", e);
      }
    }

    const found = this.localUsers.find((u) => u.id === id);
    return found ? this.formatUserDto(found) : null;
  }

  async findByEmailOrUsername(prisma: PrismaClient, identifier: string): Promise<StoredUser | null> {
    const ready = await this.isPrismaAvailable(prisma);
    if (ready) {
      try {
        const user = await prisma.user.findFirst({
          where: {
            OR: [{ email: identifier }, { username: identifier }]
          }
        });
        if (user) {
          return {
            id: user.id,
            email: user.email,
            passwordHash: user.passwordHash,
            fullName: user.fullName,
            phone: user.phone,
            username: user.username,
            birthDate: user.birthDate.toISOString(),
            role: user.role as Role,
            status: user.status as SharedUserStatus,
            emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
            stripeCustomerId: user.stripeCustomerId,
            auctionBannedUntil: user.auctionBannedUntil ? user.auctionBannedUntil.toISOString() : null,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            activity: { bookings: 0, bids: 0, tickets: 0, packageOrders: 0, consents: 3 }
          };
        }
      } catch (e) {
        console.warn("Prisma findByEmail error:", e);
      }
    }

    return (
      this.localUsers.find(
        (u) => u.email.toLowerCase() === identifier.toLowerCase() || u.username.toLowerCase() === identifier.toLowerCase()
      ) ?? null
    );
  }

  async createUser(
    prisma: PrismaClient,
    input: (RegisterInput | CreateAccountInput) & { role?: Role; status?: SharedUserStatus }
  ): Promise<UserProfileDto> {
    const birth = new Date(input.birthDate);
    const age = calculateAge(birth);
    if (age < 20) {
      throw Object.assign(new Error("ต้องมีอายุอย่างน้อย 20 ปีบริบูรณ์"), { status: 400 });
    }

    const ready = await this.isPrismaAvailable(prisma);
    if (ready) {
      try {
        const user = await prisma.user.create({
          data: {
            email: input.email.toLowerCase().trim(),
            passwordHash: await bcrypt.hash(input.password, 12),
            fullName: input.fullName.trim(),
            phone: input.phone.trim(),
            username: input.username.toLowerCase().trim(),
            birthDate: birth,
            role: (input.role as UserRole) ?? UserRole.customer,
            status: (input.status as UserStatus) ?? UserStatus.active,
            consents: {
              create: [
                { consentType: "terms", documentVersion: "v1" },
                { consentType: "privacy", documentVersion: "v1" },
                { consentType: "age_20_plus", documentVersion: "v1" }
              ]
            }
          },
          include: {
            _count: { select: { bookings: true, bids: true, tickets: true, packageOrders: true, consents: true } }
          }
        });
        return this.formatUserDto(user);
      } catch (error: any) {
        if (error.code === "P2002") {
          throw Object.assign(new Error("อีเมล, เบอร์โทร หรือ Username นี้มีผู้ใช้งานแล้ว"), { status: 409 });
        }
        throw error;
      }
    }

    // Local Store validation
    const existing = this.localUsers.find(
      (u) =>
        u.email.toLowerCase() === input.email.toLowerCase().trim() ||
        u.username.toLowerCase() === input.username.toLowerCase().trim() ||
        u.phone === input.phone.trim()
    );
    if (existing) {
      throw Object.assign(new Error("อีเมล, เบอร์โทร หรือ Username นี้มีผู้ใช้งานแล้ว"), { status: 409 });
    }

    const newUser: StoredUser = {
      id: crypto.randomUUID(),
      email: input.email.toLowerCase().trim(),
      passwordHash: await bcrypt.hash(input.password, 12),
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      username: input.username.toLowerCase().trim(),
      birthDate: birth.toISOString(),
      role: input.role ?? "customer",
      status: input.status ?? "active",
      emailVerifiedAt: new Date().toISOString(),
      stripeCustomerId: null,
      auctionBannedUntil: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activity: { bookings: 0, bids: 0, tickets: 0, packageOrders: 0, consents: 3 },
      consents: [
        { consentType: "terms", documentVersion: "v1", acceptedAt: new Date().toISOString() },
        { consentType: "privacy", documentVersion: "v1", acceptedAt: new Date().toISOString() },
        { consentType: "age_20_plus", documentVersion: "v1", acceptedAt: new Date().toISOString() }
      ]
    };

    this.localUsers.unshift(newUser);
    this.saveLocalFile();
    return this.formatUserDto(newUser);
  }

  async updateUserStatus(
    prisma: PrismaClient,
    id: string,
    data: { status?: SharedUserStatus; role?: Role }
  ): Promise<UserProfileDto> {
    const ready = await this.isPrismaAvailable(prisma);
    if (ready) {
      try {
        const updated = await prisma.user.update({
          where: { id },
          data: {
            status: data.status as UserStatus | undefined,
            role: data.role as UserRole | undefined
          },
          include: {
            _count: { select: { bookings: true, bids: true, tickets: true, packageOrders: true, consents: true } }
          }
        });
        return this.formatUserDto(updated);
      } catch (e) {
        console.warn("Prisma update error:", e);
      }
    }

    const index = this.localUsers.findIndex((u) => u.id === id);
    if (index === -1) {
      throw Object.assign(new Error("ไม่พบบัญชีผู้ใช้นี้"), { status: 404 });
    }

    if (data.status) this.localUsers[index].status = data.status;
    if (data.role) this.localUsers[index].role = data.role;
    this.localUsers[index].updatedAt = new Date().toISOString();
    this.saveLocalFile();

    return this.formatUserDto(this.localUsers[index]);
  }

  async seedDemoAccounts(prisma: PrismaClient): Promise<{ added: number }> {
    const samples = getInitialSampleUsers();
    let added = 0;

    const ready = await this.isPrismaAvailable(prisma);
    if (ready) {
      for (const sample of samples) {
        try {
          const exists = await prisma.user.findFirst({
            where: { OR: [{ email: sample.email }, { username: sample.username }] }
          });
          if (!exists) {
            await prisma.user.create({
              data: {
                id: sample.id,
                email: sample.email,
                passwordHash: sample.passwordHash,
                fullName: sample.fullName,
                phone: sample.phone,
                username: sample.username,
                birthDate: new Date(sample.birthDate),
                role: sample.role as UserRole,
                status: sample.status as UserStatus,
                emailVerifiedAt: sample.emailVerifiedAt ? new Date(sample.emailVerifiedAt) : null,
                stripeCustomerId: sample.stripeCustomerId,
                consents: {
                  create: [
                    { consentType: "terms", documentVersion: "v1" },
                    { consentType: "privacy", documentVersion: "v1" },
                    { consentType: "age_20_plus", documentVersion: "v1" }
                  ]
                }
              }
            });
            added++;
          }
        } catch {
          // ignore duplicate
        }
      }
      return { added };
    }

    for (const sample of samples) {
      if (!this.localUsers.some((u) => u.email === sample.email || u.username === sample.username)) {
        this.localUsers.push(sample);
        added++;
      }
    }
    this.saveLocalFile();
    return { added };
  }
}

export const userStore = new UserStoreManager();
