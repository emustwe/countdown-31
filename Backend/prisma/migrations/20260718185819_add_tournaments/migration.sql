-- CreateEnum
CREATE TYPE "TournamentState" AS ENUM ('SCHEDULED', 'RUNNING', 'ENDED', 'SETTLED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LedgerEntryType" ADD VALUE 'TOURNAMENT_ENTRY';
ALTER TYPE "LedgerEntryType" ADD VALUE 'TOURNAMENT_PRIZE';

-- AlterTable
ALTER TABLE "GameRound" ADD COLUMN     "tournamentEntryId" TEXT;

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "modelId" TEXT NOT NULL,
    "state" "TournamentState" NOT NULL DEFAULT 'SCHEDULED',
    "entryFee" BIGINT NOT NULL DEFAULT 0,
    "startingCredits" BIGINT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "maxEntries" INTEGER,
    "prizeJson" JSONB NOT NULL DEFAULT '[]',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentEntry" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credits" BIGINT NOT NULL,
    "score" BIGINT NOT NULL DEFAULT 0,
    "spinsCount" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "prizeAwarded" BIGINT NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tournament_state_startAt_idx" ON "Tournament"("state", "startAt");

-- CreateIndex
CREATE INDEX "TournamentEntry_tournamentId_score_idx" ON "TournamentEntry"("tournamentId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentEntry_tournamentId_userId_key" ON "TournamentEntry"("tournamentId", "userId");

-- CreateIndex
CREATE INDEX "GameRound_tournamentEntryId_idx" ON "GameRound"("tournamentEntryId");

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_tournamentEntryId_fkey" FOREIGN KEY ("tournamentEntryId") REFERENCES "TournamentEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentEntry" ADD CONSTRAINT "TournamentEntry_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentEntry" ADD CONSTRAINT "TournamentEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
