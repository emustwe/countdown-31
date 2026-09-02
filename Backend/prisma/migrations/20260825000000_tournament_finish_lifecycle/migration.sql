-- AlterTable: tournament finish / prize-delivery lifecycle
ALTER TABLE "SponsorTournament" ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "SponsorTournament" ADD COLUMN "winnerName" TEXT;
ALTER TABLE "SponsorTournament" ADD COLUMN "winnerTeam" TEXT;
ALTER TABLE "SponsorTournament" ADD COLUMN "prizeDelivered" BOOLEAN NOT NULL DEFAULT false;
