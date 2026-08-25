CREATE TABLE "TournamentCampaignAsset" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "supersedesId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentCampaignAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TournamentCampaignAsset_campaignId_kind_createdAt_idx" ON "TournamentCampaignAsset"("campaignId", "kind", "createdAt");

ALTER TABLE "TournamentCampaignAsset" ADD CONSTRAINT "TournamentCampaignAsset_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "TournamentCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
