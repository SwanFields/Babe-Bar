-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('customer', 'staff', 'admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'deleted');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('pending_payment', 'confirmed', 'checked_in', 'no_show', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending_payment', 'paid', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('scheduled', 'open', 'closed', 'settled');

-- CreateEnum
CREATE TYPE "AuctionItemStatus" AS ENUM ('open', 'closed', 'paid', 'payment_failed', 'no_bids');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'requires_action', 'succeeded', 'failed', 'canceled', 'refunded');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('active', 'used', 'expired', 'void');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'customer',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "emailVerifiedAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "auctionBannedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentLog" (
    "id" BIGSERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "consentType" TEXT NOT NULL,
    "documentVersion" TEXT NOT NULL,
    "ip" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "stripePaymentMethodId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "expMonth" INTEGER NOT NULL,
    "expYear" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detachedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "nameTh" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenueTable" (
    "id" SERIAL NOT NULL,
    "zoneId" INTEGER NOT NULL,
    "tableNo" TEXT NOT NULL,
    "capacityMin" INTEGER NOT NULL DEFAULT 1,
    "capacityMax" INTEGER NOT NULL,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VenueTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "bookingCode" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "tableId" INTEGER NOT NULL,
    "businessDate" DATE NOT NULL,
    "partySizeRange" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "arrivalAt" TIMESTAMP(3) NOT NULL,
    "graceUntil" TIMESTAMP(3) NOT NULL,
    "depositSatang" INTEGER NOT NULL DEFAULT 35000,
    "status" "BookingStatus" NOT NULL DEFAULT 'pending_payment',
    "depositForfeited" BOOLEAN NOT NULL DEFAULT false,
    "specialRequest" TEXT,
    "holdExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceSatang" INTEGER NOT NULL,
    "includes" JSONB NOT NULL,
    "requiresHostPick" BOOLEAN NOT NULL DEFAULT false,
    "validDays" INTEGER NOT NULL DEFAULT 7,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Host" (
    "id" SERIAL NOT NULL,
    "stageName" TEXT NOT NULL,
    "bio" TEXT,
    "photoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Host_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageOrder" (
    "id" UUID NOT NULL,
    "orderCode" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "packageId" INTEGER NOT NULL,
    "priceSatang" INTEGER NOT NULL,
    "chosenHostId" INTEGER,
    "useDate" DATE,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending_payment',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuctionSession" (
    "id" SERIAL NOT NULL,
    "businessDate" DATE NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "status" "AuctionStatus" NOT NULL DEFAULT 'scheduled',

    CONSTRAINT "AuctionSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuctionItem" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "hostId" INTEGER NOT NULL,
    "startPriceSatang" INTEGER NOT NULL DEFAULT 0,
    "minIncrementSatang" INTEGER NOT NULL DEFAULT 25000,
    "currentPriceSatang" INTEGER NOT NULL DEFAULT 0,
    "leadingUserId" UUID,
    "winnerUserId" UUID,
    "status" "AuctionItemStatus" NOT NULL DEFAULT 'open',

    CONSTRAINT "AuctionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" BIGSERIAL NOT NULL,
    "auctionItemId" INTEGER NOT NULL,
    "userId" UUID NOT NULL,
    "paymentMethodId" UUID NOT NULL,
    "amountSatang" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "termsVersion" TEXT NOT NULL,
    "termsAcceptedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "purpose" TEXT NOT NULL,
    "bookingId" UUID,
    "packageOrderId" UUID,
    "auctionItemId" INTEGER,
    "paymentMethodId" UUID,
    "method" TEXT NOT NULL,
    "amountSatang" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'thb',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "stripePaymentIntentId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ETicket" (
    "id" UUID NOT NULL,
    "ticketCode" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "ticketType" TEXT NOT NULL,
    "bookingId" UUID,
    "packageOrderId" UUID,
    "status" "TicketStatus" NOT NULL DEFAULT 'active',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ETicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketRedemption" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "staffId" UUID NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventClaim" (
    "id" UUID NOT NULL,
    "eventId" INTEGER NOT NULL,
    "userId" UUID NOT NULL,
    "businessDate" DATE NOT NULL,
    "bookingId" UUID,
    "verifiedBy" UUID,

    CONSTRAINT "EventClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" BIGSERIAL NOT NULL,
    "actorUserId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "packageId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthToken_tokenHash_key" ON "AuthToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshSession_tokenHash_key" ON "RefreshSession"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_stripePaymentMethodId_key" ON "PaymentMethod"("stripePaymentMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_code_key" ON "Zone"("code");

-- CreateIndex
CREATE UNIQUE INDEX "VenueTable_tableNo_key" ON "VenueTable"("tableNo");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingCode_key" ON "Booking"("bookingCode");

-- CreateIndex
CREATE UNIQUE INDEX "Package_code_key" ON "Package"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Host_stageName_key" ON "Host"("stageName");

-- CreateIndex
CREATE UNIQUE INDEX "PackageOrder_orderCode_key" ON "PackageOrder"("orderCode");

-- CreateIndex
CREATE UNIQUE INDEX "AuctionSession_businessDate_key" ON "AuctionSession"("businessDate");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ETicket_ticketCode_key" ON "ETicket"("ticketCode");

-- CreateIndex
CREATE UNIQUE INDEX "ETicket_qrToken_key" ON "ETicket"("qrToken");

-- CreateIndex
CREATE UNIQUE INDEX "ETicket_bookingId_key" ON "ETicket"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "ETicket_packageOrderId_key" ON "ETicket"("packageOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketRedemption_ticketId_key" ON "TicketRedemption"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_code_key" ON "Ticket"("code");

-- AddForeignKey
ALTER TABLE "AuthToken" ADD CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentLog" ADD CONSTRAINT "ConsentLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenueTable" ADD CONSTRAINT "VenueTable_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "VenueTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageOrder" ADD CONSTRAINT "PackageOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageOrder" ADD CONSTRAINT "PackageOrder_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageOrder" ADD CONSTRAINT "PackageOrder_chosenHostId_fkey" FOREIGN KEY ("chosenHostId") REFERENCES "Host"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionItem" ADD CONSTRAINT "AuctionItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AuctionSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionItem" ADD CONSTRAINT "AuctionItem_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "Host"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionItem" ADD CONSTRAINT "AuctionItem_leadingUserId_fkey" FOREIGN KEY ("leadingUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionItem" ADD CONSTRAINT "AuctionItem_winnerUserId_fkey" FOREIGN KEY ("winnerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_auctionItemId_fkey" FOREIGN KEY ("auctionItemId") REFERENCES "AuctionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_packageOrderId_fkey" FOREIGN KEY ("packageOrderId") REFERENCES "PackageOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_auctionItemId_fkey" FOREIGN KEY ("auctionItemId") REFERENCES "AuctionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ETicket" ADD CONSTRAINT "ETicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ETicket" ADD CONSTRAINT "ETicket_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ETicket" ADD CONSTRAINT "ETicket_packageOrderId_fkey" FOREIGN KEY ("packageOrderId") REFERENCES "PackageOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketRedemption" ADD CONSTRAINT "TicketRedemption_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "ETicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketRedemption" ADD CONSTRAINT "TicketRedemption_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventClaim" ADD CONSTRAINT "EventClaim_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventClaim" ADD CONSTRAINT "EventClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventClaim" ADD CONSTRAINT "EventClaim_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
