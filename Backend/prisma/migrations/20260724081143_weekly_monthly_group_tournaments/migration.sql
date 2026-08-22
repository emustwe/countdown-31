-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TournamentFormat" ADD VALUE 'WEEKLY';
ALTER TYPE "TournamentFormat" ADD VALUE 'MONTHLY';

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "matchDurationSec" INTEGER NOT NULL DEFAULT 300;

-- AlterTable
ALTER TABLE "TournamentEntry" ADD COLUMN     "currentRound" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "eliminated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TournamentRound" ADD COLUMN     "advancePerGroup" INTEGER,
ADD COLUMN     "groupCount" INTEGER,
ADD COLUMN     "playersPerGroup" INTEGER;
