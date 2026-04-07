-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('ACTIVE', 'PAID', 'LOST_PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "ParkingConfig" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "parkingName" TEXT NOT NULL DEFAULT 'Parqueo Moto Badia',
    "normalRate" INTEGER NOT NULL DEFAULT 25,
    "lostTicketRate" INTEGER NOT NULL DEFAULT 100,
    "shift1Start" TEXT NOT NULL DEFAULT '06:00',
    "shift1End" TEXT NOT NULL DEFAULT '14:00',
    "shift2Start" TEXT NOT NULL DEFAULT '14:00',
    "shift2End" TEXT NOT NULL DEFAULT '22:00',
    "ticketHeader" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParkingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "ticketNumber" INTEGER NOT NULL,
    "plate" TEXT,
    "status" "TicketStatus" NOT NULL DEFAULT 'ACTIVE',
    "entryTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitTime" TIMESTAMP(3),
    "amountCharged" INTEGER,
    "isLostTicket" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "closureId" TEXT,
    "localId" TEXT,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftClosure" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shiftLabel" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalTickets" INTEGER NOT NULL,
    "normalTickets" INTEGER NOT NULL,
    "lostTickets" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "normalAmount" INTEGER NOT NULL,
    "lostAmount" INTEGER NOT NULL,
    "notes" TEXT,
    "localId" TEXT,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftClosure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Administrador',

    CONSTRAINT "AdminAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_localId_key" ON "Ticket"("localId");

-- CreateIndex
CREATE INDEX "Ticket_ticketNumber_idx" ON "Ticket"("ticketNumber");

-- CreateIndex
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");

-- CreateIndex
CREATE INDEX "Ticket_entryTime_idx" ON "Ticket"("entryTime");

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "Ticket"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftClosure_localId_key" ON "ShiftClosure"("localId");

-- CreateIndex
CREATE INDEX "ShiftClosure_userId_idx" ON "ShiftClosure"("userId");

-- CreateIndex
CREATE INDEX "ShiftClosure_endTime_idx" ON "ShiftClosure"("endTime");

-- CreateIndex
CREATE UNIQUE INDEX "AdminAccount_email_key" ON "AdminAccount"("email");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_closureId_fkey" FOREIGN KEY ("closureId") REFERENCES "ShiftClosure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftClosure" ADD CONSTRAINT "ShiftClosure_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
