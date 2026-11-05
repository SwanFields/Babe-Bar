import { HttpError } from "../lib/errors";
import { prisma } from "../lib/prisma";

/** Ticket ที่ยัง active แต่เลย validUntil แล้ว ให้เปลี่ยนเป็น expired */
export const expireStaleTickets = async () =>
  (await prisma.eTicket.updateMany({ where: { status: "active", validUntil: { lt: new Date() } }, data: { status: "expired" } })).count;

export const ticketService = {
  async listForUser(userId: string) {
    await expireStaleTickets();
    const tickets = await prisma.eTicket.findMany({
      where: { userId },
      include: { booking: { include: { table: { include: { zone: true } } } }, packageOrder: { include: { package: true } } },
      orderBy: { createdAt: "desc" }
    });
    // ดึงการชำระเงินของตั๋วทุกใบในคำสั่งเดียว (แทนการ query ทีละใบ)
    const bookingIds = tickets.flatMap((t) => (t.bookingId ? [t.bookingId] : []));
    const orderIds = tickets.flatMap((t) => (t.packageOrderId ? [t.packageOrderId] : []));
    const payments = await prisma.payment.findMany({
      where: { userId, OR: [{ bookingId: { in: bookingIds } }, { packageOrderId: { in: orderIds } }] },
      orderBy: { paidAt: { sort: "desc", nulls: "last" } },
      select: { bookingId: true, packageOrderId: true, amountSatang: true, paidAt: true, status: true }
    });
    return tickets.map((t) => {
      const match = payments.find((p) => (t.bookingId && p.bookingId === t.bookingId) || (t.packageOrderId && p.packageOrderId === t.packageOrderId));
      return { ...t, payment: match ? { amountSatang: match.amountSatang, paidAt: match.paidAt, status: match.status } : null };
    });
  },

  /** พนักงานสแกนใช้ตั๋ว */
  async redeem(ticketCode: string, staffId: string) {
    const ticket = await prisma.eTicket.findUnique({ where: { ticketCode } });
    if (!ticket) throw new HttpError(404, "ไม่พบ Ticket นี้ในระบบ");
    if (ticket.status === "used") throw new HttpError(409, "Ticket นี้ถูกใช้งานไปแล้ว");
    if (ticket.status === "void") throw new HttpError(409, "Ticket นี้ถูกยกเลิกแล้ว");

    const now = new Date();
    if (ticket.validUntil < now) {
      await prisma.eTicket.update({ where: { id: ticket.id }, data: { status: "expired" } });
      throw new HttpError(409, "Ticket นี้หมดอายุแล้ว");
    }
    if (ticket.validFrom > now) throw new HttpError(409, "Ticket นี้ยังไม่ถึงเวลาใช้งาน");

    return prisma.$transaction(async (tx) => {
      // เงื่อนไข status:"active" ถูกตัดสินใน SQL คำสั่งเดียว → สแกนพร้อมกันผ่านได้แค่คนเดียว
      const claimed = await tx.eTicket.updateMany({ where: { id: ticket.id, status: "active" }, data: { status: "used" } });
      if (!claimed.count) throw new HttpError(409, "Ticket นี้ถูกใช้งานไปแล้ว");
      await tx.ticketRedemption.create({ data: { ticketId: ticket.id, staffId } });
      return tx.eTicket.findUnique({ where: { id: ticket.id }, include: { redemption: true, packageOrder: { include: { package: true } }, booking: true } });
    });
  }
};
