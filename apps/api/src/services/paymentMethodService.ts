import { HttpError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { ensureStripeCustomer, getStripe } from "../lib/stripe";

const publicFields = { id: true, brand: true, last4: true, expMonth: true, expYear: true, isDefault: true } as const;
const userForStripe = { id: true, email: true, fullName: true, stripeCustomerId: true } as const;

export const paymentMethodService = {
  list: (userId: string) => prisma.paymentMethod.findMany({ where: { userId, detachedAt: null }, orderBy: { createdAt: "desc" }, select: publicFields }),

  /** ให้หน้าเว็บเก็บบัตรกับ Stripe โดยตรง (เซิร์ฟเวอร์เราไม่แตะเลขบัตร) */
  async createSetupIntent(userId: string) {
    const stripe = getStripe();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: userForStripe });
    const customer = await ensureStripeCustomer(user);
    const intent = await stripe.setupIntents.create({ customer, automatic_payment_methods: { enabled: true }, usage: "off_session", metadata: { userId } });
    return { clientSecret: intent.client_secret };
  },

  /** บันทึกเฉพาะ brand / 4 หลักท้าย / วันหมดอายุ ลง DB */
  async save(userId: string, stripePaymentMethodId: string) {
    const stripe = getStripe();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: userForStripe });
    const customer = await ensureStripeCustomer(user);
    const method = await stripe.paymentMethods.retrieve(stripePaymentMethodId);
    if (method.type !== "card" || !method.card) throw new HttpError(400, "รองรับเฉพาะบัตรเครดิต/เดบิต");
    if (method.customer && method.customer !== customer) throw new HttpError(403, "บัตรนี้ไม่ใช่ของบัญชีนี้");
    if (!method.customer) await stripe.paymentMethods.attach(method.id, { customer });

    const { brand, last4, exp_month, exp_year } = method.card;
    return prisma.$transaction(async (tx) => {
      await tx.paymentMethod.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      return tx.paymentMethod.create({
        data: { userId, stripePaymentMethodId: method.id, brand, last4, expMonth: exp_month, expYear: exp_year, isDefault: true },
        select: publicFields
      });
    });
  }
};
