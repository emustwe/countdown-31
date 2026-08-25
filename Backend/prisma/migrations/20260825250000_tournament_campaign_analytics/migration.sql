-- CreateTable
CREATE TABLE "TournamentCampaignEventAggregate" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
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
CREATE UNIQUE INDEX "TournamentCampaignEventAggregate_campaignId_revision_placement_deviceClass_eventType_dateBucket_key" ON "TournamentCampaignEventAggregate"("campaignId", "revision", "placement", "deviceClass", "eventType", "dateBucket");

-- CreateIndex
CREATE INDEX "TournamentCampaignEventAggregate_tournamentId_createdAt_idx" ON "TournamentCampaignEventAggregate"("tournamentId", "createdAt");

-- CreateIndex
CREATE INDEX "TournamentCampaignEventAggregate_campaignId_dateBucket_idx" ON "TournamentCampaignEventAggregate"("campaignId", "dateBucket");

-- AddForeignKey
ALTER TABLE "TournamentCampaignEventAggregate" ADD CONSTRAINT "TournamentCampaignEventAggregate_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "TournamentCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
