import { z } from "zod";

export const roleSchema = z.enum(["customer", "staff", "admin"]);
export const userStatusSchema = z.enum(["active", "suspended", "deleted"]);

export const loginSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
});

export const registerSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
  fullName: z.string().min(2, "ชื่อ-นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร"),
  phone: z.string().min(8, "เบอร์โทรศัพท์ต้องมีอย่างน้อย 8 ตัวอักษร"),
  username: z.string().regex(/^[a-z0-9_]{3,20}$/, "Username ต้องเป็น a-z, 0-9, _ ความยาว 3-20 ตัวอักษร"),
  birthDate: z.coerce.date(),
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: "กรุณายอมรับเงื่อนไขการใช้งาน" }) }),
  ageConfirmed: z.literal(true, { errorMap: () => ({ message: "กรุณายืนยันว่าอายุ 20 ปีขึ้นไป" }) })
});

export const createAccountSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
  fullName: z.string().min(2, "ชื่อ-นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร"),
  phone: z.string().min(8, "เบอร์โทรศัพท์ต้องมีอย่างน้อย 8 ตัวอักษร"),
  username: z.string().regex(/^[a-z0-9_]{3,20}$/, "Username ต้องเป็น a-z, 0-9, _ ความยาว 3-20 ตัวอักษร"),
  birthDate: z.coerce.date(),
  role: roleSchema.default("customer"),
  status: userStatusSchema.default("active")
});

export const updateUserStatusSchema = z.object({
  status: userStatusSchema.optional(),
  role: roleSchema.optional()
});

export const bookingSchema = z.object({
  tableId: z.number().int().positive(),
  businessDate: z.string().date(),
  partySizeRange: z.enum(["1-3", "4-6", "7-10", "10+"]),
  guestName: z.string().min(2),
  arrivalAt: z.coerce.date(),
  specialRequest: z.string().max(500).optional()
});

export const bidSchema = z.object({
  amountDrinks: z.number().int().min(1, "ต้องบิดอย่างน้อย 1 ดริ้ง"),
  paymentMethodId: z.string().uuid()
});
export const setupPaymentMethodSchema = z.object({
  paymentMethodId: z.string().startsWith("pm_", "PaymentMethod จาก Stripe ไม่ถูกต้อง")
});
export const packageOrderSchema = z.object({ packageId: z.number().int().positive(), useDate: z.string().date().optional() });
export const checkoutSchema = z.object({ kind: z.enum(["booking", "package"]), id: z.string().min(1) });
export const auctionScheduleSchema = z.object({
  opensAt: z.coerce.date(),
  closesAt: z.coerce.date()
}).refine((value) => value.closesAt > value.opensAt, { message: "เวลาปิดต้องหลังเวลาเปิด" });

export type Role = z.infer<typeof roleSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

export type UserProfileDto = {
  id: string;
  email: string;
  username: string;
  fullName: string;
  phone: string;
  birthDate: string;
  age: number;
  role: Role;
  status: UserStatus;
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
};

export const apiError = (message: string) => ({ error: message });
