-- AlterTable
ALTER TABLE "ScheduleEntry" ADD COLUMN     "goHomeMaxDetourMins" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "toCampusMaxDetourMins" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "homeAddress" TEXT,
ADD COLUMN     "homeLat" DOUBLE PRECISION,
ADD COLUMN     "homeLng" DOUBLE PRECISION;
