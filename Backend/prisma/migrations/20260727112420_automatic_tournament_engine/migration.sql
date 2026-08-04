-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "roundGapSec" INTEGER NOT NULL DEFAULT 600;

-- AlterTable
ALTER TABLE "TournamentRound" ADD COLUMN     "startNotifiedAt" TIMESTAMP(3);
