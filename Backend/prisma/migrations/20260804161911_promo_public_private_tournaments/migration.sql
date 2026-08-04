-- CreateEnum
CREATE TYPE "PromoVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- DropForeignKey
ALTER TABLE "GameRound" DROP CONSTRAINT "GameRound_tournamentEntryId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_roundId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "MatchPlayer" DROP CONSTRAINT "MatchPlayer_matchId_fkey";

-- DropForeignKey
ALTER TABLE "MatchPlayer" DROP CONSTRAINT "MatchPlayer_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "RebuyRequest" DROP CONSTRAINT "RebuyRequest_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "RebuyRequest" DROP CONSTRAINT "RebuyRequest_userId_fkey";

-- DropForeignKey
ALTER TABLE "TournamentEntry" DROP CONSTRAINT "TournamentEntry_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "TournamentEntry" DROP CONSTRAINT "TournamentEntry_userId_fkey";

-- DropForeignKey
ALTER TABLE "TournamentRound" DROP CONSTRAINT "TournamentRound_tournamentId_fkey";

-- DropIndex
DROP INDEX "GameRound_tournamentEntryId_idx";

-- AlterTable
ALTER TABLE "GameRound" DROP COLUMN "tournamentEntryId";

-- AlterTable
ALTER TABLE "SponsorTournament" ADD COLUMN     "endAt" TIMESTAMP(3),
ADD COLUMN     "joinCode" TEXT,
ADD COLUMN     "prizePool" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sponsorCode" TEXT,
ADD COLUMN     "startAt" TIMESTAMP(3),
ADD COLUMN     "visibility" "PromoVisibility" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "winnerCount" INTEGER NOT NULL DEFAULT 1;

-- DropTable
DROP TABLE "Match";

-- DropTable
DROP TABLE "MatchPlayer";

-- DropTable
DROP TABLE "RebuyRequest";

-- DropTable
DROP TABLE "Tournament";

-- DropTable
DROP TABLE "TournamentEntry";

-- DropTable
DROP TABLE "TournamentRound";

-- DropEnum
DROP TYPE "MatchState";

-- DropEnum
DROP TYPE "RebuyStatus";

-- DropEnum
DROP TYPE "TournamentBrand";

-- DropEnum
DROP TYPE "TournamentFormat";

-- DropEnum
DROP TYPE "TournamentState";

-- CreateTable
CREATE TABLE "PromoEntry" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromoEntry_userId_idx" ON "PromoEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PromoEntry_tournamentId_userId_key" ON "PromoEntry"("tournamentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "SponsorTournament_sponsorCode_key" ON "SponsorTournament"("sponsorCode");

-- CreateIndex
CREATE UNIQUE INDEX "SponsorTournament_joinCode_key" ON "SponsorTournament"("joinCode");

-- CreateIndex
CREATE INDEX "SponsorTournament_visibility_status_idx" ON "SponsorTournament"("visibility", "status");

-- AddForeignKey
ALTER TABLE "PromoEntry" ADD CONSTRAINT "PromoEntry_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "SponsorTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoEntry" ADD CONSTRAINT "PromoEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

