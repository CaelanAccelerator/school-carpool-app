-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DRIVER', 'PASSENGER', 'BOTH');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('EMAIL', 'PHONE', 'WECHAT', 'OTHER');

-- CreateEnum
CREATE TYPE "ConnectionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "contactType" "ContactType" NOT NULL,
    "contactValue" TEXT NOT NULL,
    "campus" TEXT NOT NULL,
    "homeArea" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'BOTH',
    "timeZone" TEXT NOT NULL DEFAULT 'America/Vancouver',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "toCampusMins" INTEGER NOT NULL,
    "goHomeMins" INTEGER NOT NULL,
    "toCampusFlexMin" INTEGER NOT NULL DEFAULT 15,
    "goHomeFlexMin" INTEGER NOT NULL DEFAULT 15,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConnectionRequest" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "message" TEXT,
    "status" "ConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_campus_idx" ON "User"("campus");

-- CreateIndex
CREATE INDEX "User_homeArea_idx" ON "User"("homeArea");

-- CreateIndex
CREATE INDEX "ScheduleEntry_dayOfWeek_toCampusMins_idx" ON "ScheduleEntry"("dayOfWeek", "toCampusMins");

-- CreateIndex
CREATE INDEX "ScheduleEntry_dayOfWeek_goHomeMins_idx" ON "ScheduleEntry"("dayOfWeek", "goHomeMins");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleEntry_userId_dayOfWeek_key" ON "ScheduleEntry"("userId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "ConnectionRequest_toUserId_status_createdAt_idx" ON "ConnectionRequest"("toUserId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectionRequest_fromUserId_toUserId_key" ON "ConnectionRequest"("fromUserId", "toUserId");

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionRequest" ADD CONSTRAINT "ConnectionRequest_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConnectionRequest" ADD CONSTRAINT "ConnectionRequest_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
