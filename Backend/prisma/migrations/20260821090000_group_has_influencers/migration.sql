-- AlterTable
ALTER TABLE "SponsorTournament" ADD COLUMN     "hasInfluencers" BOOLEAN NOT NULL DEFAULT false;

UPDATE "SponsorTournament" SET "hasInfluencers" = true WHERE "type" = 'INFLUENCER';
