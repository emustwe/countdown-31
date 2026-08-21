-- AlterTable
ALTER TABLE "SponsorTournament" ADD COLUMN     "groupCount" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "maxGroupPlayers" INTEGER,
ADD COLUMN     "minGroupPlayers" INTEGER;

