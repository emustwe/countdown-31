-- AlterTable: locked skill loadout chosen at join time
ALTER TABLE "PromoEntry" ADD COLUMN "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];
