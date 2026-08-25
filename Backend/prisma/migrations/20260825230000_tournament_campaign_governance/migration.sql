ALTER TABLE "TournamentCampaignVersion"
ADD COLUMN "approvedBy" TEXT,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "activateAt" TIMESTAMP(3),
ADD COLUMN "expireAt" TIMESTAMP(3);

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

CREATE INDEX "TournamentCampaignReview_versionId_createdAt_idx" ON "TournamentCampaignReview"("versionId", "createdAt");

ALTER TABLE "TournamentCampaignReview" ADD CONSTRAINT "TournamentCampaignReview_versionId_fkey"
FOREIGN KEY ("versionId") REFERENCES "TournamentCampaignVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
