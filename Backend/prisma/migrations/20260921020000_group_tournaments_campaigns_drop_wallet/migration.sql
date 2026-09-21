-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('PENDING', 'PLAYING', 'DONE');

-- CreateEnum
CREATE TYPE "MemberResult" AS ENUM ('PENDING', 'ADVANCED', 'ELIMINATED');

-- AlterEnum
BEGIN;
CREATE TYPE "PromoType_new" AS ENUM ('REGULAR', 'GROUP');
ALTER TABLE "public"."SponsorTournament" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "SponsorTournament" ALTER COLUMN "type" TYPE "PromoType_new" USING ("type"::text::"PromoType_new");
ALTER TYPE "PromoType" RENAME TO "PromoType_old";
ALTER TYPE "PromoType_new" RENAME TO "PromoType";
DROP TYPE "public"."PromoType_old";
ALTER TABLE "SponsorTournament" ALTER COLUMN "type" SET DEFAULT 'REGULAR';
COMMIT;

-- DropForeignKey
ALTER TABLE "CryptoTransfer" DROP CONSTRAINT "CryptoTransfer_userId_fkey";

-- DropForeignKey
ALTER TABLE "DepositBinding" DROP CONSTRAINT "DepositBinding_userId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerEntry" DROP CONSTRAINT "LedgerEntry_walletId_fkey";

-- DropForeignKey
ALTER TABLE "PromoEntry" DROP CONSTRAINT "PromoEntry_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TournamentTeam" DROP CONSTRAINT "TournamentTeam_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "Wallet" DROP CONSTRAINT "Wallet_userId_fkey";

-- DropIndex
DROP INDEX "PromoEntry_teamId_idx";

-- AlterTable
ALTER TABLE "PlatformConfig" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PromoEntry" DROP COLUMN "isCaptain",
DROP COLUMN "teamId",
ADD COLUMN     "seq" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SponsorTournament" DROP COLUMN "groupCount",
DROP COLUMN "hasInfluencers",
DROP COLUMN "maxGroupPlayers",
DROP COLUMN "minGroupPlayers",
DROP COLUMN "winnerTeam",
ADD COLUMN     "durationDays" INTEGER,
ADD COLUMN     "entryClosesAt" TIMESTAMP(3),
ADD COLUMN     "groupsAssignedAt" TIMESTAMP(3),
ADD COLUMN     "themeId" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "isSystem";

-- DropTable
DROP TABLE "CryptoTransfer";

-- DropTable
DROP TABLE "DepositBinding";

-- DropTable
DROP TABLE "IdempotencyKey";

-- DropTable
DROP TABLE "LedgerEntry";

-- DropTable
DROP TABLE "TournamentTeam";

-- DropTable
DROP TABLE "Wallet";

-- DropEnum
DROP TYPE "CryptoDirection";

-- DropEnum
DROP TYPE "CryptoTransferStatus";

-- DropEnum
DROP TYPE "LedgerEntryType";

-- CreateTable
CREATE TABLE "TournamentGroup" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "day" INTEGER,
    "scheduledAt" TIMESTAMP(3),
    "status" "GroupStatus" NOT NULL DEFAULT 'PENDING',
    "winnerUserId" TEXT,
    "winnerName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seat" INTEGER NOT NULL,
    "result" "MemberResult" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentCampaign" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "isCausePaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentCampaignVersion" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "manifest" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "activateAt" TIMESTAMP(3),
    "expireAt" TIMESTAMP(3),

    CONSTRAINT "TournamentCampaignVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentCampaignReview" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "lane" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentCampaignReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentCampaignAsset" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL DEFAULT '',
    "originalName" TEXT NOT NULL DEFAULT '',
    "mimeType" TEXT NOT NULL DEFAULT '',
    "mediaType" TEXT NOT NULL DEFAULT 'image',
    "bytes" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL DEFAULT '',
    "supersedesId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentCampaignAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentCampaignTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "badge" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "manifest" JSONB NOT NULL,
    "isPreset" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentCampaignTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentCampaignEventAggregate" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "placement" TEXT NOT NULL,
    "deviceClass" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "totalSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dateBucket" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentCampaignEventAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentGroup_tournamentId_idx" ON "TournamentGroup"("tournamentId");

-- CreateIndex
CREATE INDEX "GroupMember_userId_idx" ON "GroupMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentCampaign_tournamentId_key" ON "TournamentCampaign"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentCampaignVersion_campaignId_status_idx" ON "TournamentCampaignVersion"("campaignId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentCampaignVersion_campaignId_revision_key" ON "TournamentCampaignVersion"("campaignId", "revision");

-- CreateIndex
CREATE INDEX "TournamentCampaignReview_versionId_createdAt_idx" ON "TournamentCampaignReview"("versionId", "createdAt");

-- CreateIndex
CREATE INDEX "TournamentCampaignAsset_campaignId_kind_createdAt_idx" ON "TournamentCampaignAsset"("campaignId", "kind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentCampaignTemplate_slug_key" ON "TournamentCampaignTemplate"("slug");

-- CreateIndex
CREATE INDEX "TournamentCampaignTemplate_isPreset_category_idx" ON "TournamentCampaignTemplate"("isPreset", "category");

-- CreateIndex
CREATE INDEX "TournamentCampaignEventAggregate_tournamentId_dateBucket_idx" ON "TournamentCampaignEventAggregate"("tournamentId", "dateBucket");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentCampaignEventAggregate_campaignId_revision_placem_key" ON "TournamentCampaignEventAggregate"("campaignId", "revision", "placement", "deviceClass", "eventType", "dateBucket");

-- AddForeignKey
ALTER TABLE "TournamentGroup" ADD CONSTRAINT "TournamentGroup_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "SponsorTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TournamentGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentCampaign" ADD CONSTRAINT "TournamentCampaign_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "SponsorTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentCampaignVersion" ADD CONSTRAINT "TournamentCampaignVersion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "TournamentCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentCampaignReview" ADD CONSTRAINT "TournamentCampaignReview_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "TournamentCampaignVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentCampaignAsset" ADD CONSTRAINT "TournamentCampaignAsset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "TournamentCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentCampaignEventAggregate" ADD CONSTRAINT "TournamentCampaignEventAggregate_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "TournamentCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

