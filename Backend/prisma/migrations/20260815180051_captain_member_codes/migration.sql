-- AlterTable
ALTER TABLE "PromoEntry" ADD COLUMN     "isCaptain" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TournamentTeam" ADD COLUMN     "memberCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TournamentTeam_memberCode_key" ON "TournamentTeam"("memberCode");

