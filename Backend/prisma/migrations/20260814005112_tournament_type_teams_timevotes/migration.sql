-- CreateEnum
CREATE TYPE "PromoType" AS ENUM ('REGULAR', 'INFLUENCER');

-- AlterTable
ALTER TABLE "PromoEntry" ADD COLUMN     "teamId" TEXT;

-- AlterTable
ALTER TABLE "SponsorTournament" ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "timeOptions" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "type" "PromoType" NOT NULL DEFAULT 'REGULAR';

-- CreateTable
CREATE TABLE "TournamentTeam" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "captainName" TEXT NOT NULL,
    "captainCode" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#5aa8ff',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentTimeVote" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentTimeVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TournamentTeam_captainCode_key" ON "TournamentTeam"("captainCode");

-- CreateIndex
CREATE INDEX "TournamentTeam_tournamentId_idx" ON "TournamentTeam"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentTimeVote_tournamentId_idx" ON "TournamentTimeVote"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentTimeVote_tournamentId_userId_key" ON "TournamentTimeVote"("tournamentId", "userId");

-- CreateIndex
CREATE INDEX "PromoEntry_teamId_idx" ON "PromoEntry"("teamId");

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "SponsorTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTimeVote" ADD CONSTRAINT "TournamentTimeVote_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "SponsorTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoEntry" ADD CONSTRAINT "PromoEntry_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

