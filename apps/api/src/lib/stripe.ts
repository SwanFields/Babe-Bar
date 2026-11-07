import Stripe from "stripe";
import { HttpError } from "./errors";
import { prisma } from "./prisma";

const stripeOrNull = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

/** ใช้ตอนต้องเรียก Stripe จริง ถ้ายังไม่ตั้งค่าคีย์จะตอบ 503 */
export function getStripe(): Stripe {
  if (!stripeOrNull) throw new HttpError(503, "ยังไม่ได้ตั้งค่า Stripe Test Mode");
  return stripeOrNull;
}

export const isStripeConfigured = () => stripeOrNull !== null;

type StripeUser = { id: string; email: string; fullName: string; stripeCustomerId: string | null };

export async function ensureStripeCustomer(user: StripeUser): Promise<string> {
  const stripe = getStripe();
  if (user.stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(user.stripeCustomerId);
      if (!customer.deleted) return user.stripeCustomerId;
    } catch (error) {
      if (!(error instanceof Stripe.errors.StripeError) || error.code !== "resource_missing") throw error;
    }
  }
  const customer = await stripe.customers.create({ email: user.email, name: user.fullName, metadata: { userId: user.id } });
  await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}
