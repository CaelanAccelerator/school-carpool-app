-- CreateEnum
CREATE TYPE "TripDirection" AS ENUM ('TO_CAMPUS', 'GO_HOME');

-- CreateEnum
CREATE TYPE "RideRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "RideRequest" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "direction" "TripDirection" NOT NULL,
    "message" TEXT,
    "status" "RideRequestStatus" NOT NULL DEFAULT 'PENDING',
    "driverNote" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RideRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RideRequest_toUserId_status_createdAt_idx" ON "RideRequest"("toUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "RideRequest_fromUserId_status_createdAt_idx" ON "RideRequest"("fromUserId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RideRequest_fromUserId_toUserId_dayOfWeek_direction_key" ON "RideRequest"("fromUserId", "toUserId", "dayOfWeek", "direction");

-- AddForeignKey
ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideRequest" ADD CONSTRAINT "RideRequest_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
