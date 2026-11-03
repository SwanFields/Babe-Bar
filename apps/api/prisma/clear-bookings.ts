import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const bookings = await tx.booking.findMany({ select: { id: true } });
    const bookingIds = bookings.map(({ id }) => id);

    if (bookingIds.length === 0) return { bookings: 0, payments: 0, tickets: 0, eventClaims: 0 };

    const tickets = await tx.eTicket.findMany({
      where: { bookingId: { in: bookingIds } },
      select: { id: true }
    });
    const ticketIds = tickets.map(({ id }) => id);

    const redemptions = ticketIds.length
      ? await tx.ticketRedemption.deleteMany({ where: { ticketId: { in: ticketIds } } })
      : { count: 0 };
    void redemptions;

    const deletedTickets = await tx.eTicket.deleteMany({ where: { bookingId: { in: bookingIds } } });
    const deletedClaims = await tx.eventClaim.deleteMany({ where: { bookingId: { in: bookingIds } } });
    const deletedPayments = await tx.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
    const deletedBookings = await tx.booking.deleteMany({ where: { id: { in: bookingIds } } });

    return {
      bookings: deletedBookings.count,
      payments: deletedPayments.count,
      tickets: deletedTickets.count,
      eventClaims: deletedClaims.count
    };
  });

  console.log("ล้างข้อมูลการจองโต๊ะเรียบร้อย:", result);
}

main()
  .catch((error) => {
    console.error("ล้างข้อมูลการจองโต๊ะไม่สำเร็จ:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
