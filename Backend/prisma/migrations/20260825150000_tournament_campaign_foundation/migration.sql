CREATE TABLE "TournamentCampaign" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TournamentCampaignVersion" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "manifest" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "TournamentCampaignVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TournamentCampaign_tournamentId_key" ON "TournamentCampaign"("tournamentId");
CREATE UNIQUE INDEX "TournamentCampaignVersion_campaignId_revision_key" ON "TournamentCampaignVersion"("campaignId", "revision");
CREATE INDEX "TournamentCampaignVersion_campaignId_status_idx" ON "TournamentCampaignVersion"("campaignId", "status");

ALTER TABLE "TournamentCampaign" ADD CONSTRAINT "TournamentCampaign_tournamentId_fkey"
FOREIGN KEY ("tournamentId") REFERENCES "SponsorTournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TournamentCampaignVersion" ADD CONSTRAINT "TournamentCampaignVersion_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "TournamentCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
