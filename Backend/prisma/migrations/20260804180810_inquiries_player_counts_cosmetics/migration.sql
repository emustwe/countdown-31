-- CreateEnum
CREATE TYPE "InquiryType" AS ENUM ('SPONSORSHIP', 'ENTRY');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

-- AlterTable
ALTER TABLE "SponsorTournament" ADD COLUMN     "maxPlayers" INTEGER,
ADD COLUMN     "minPlayers" INTEGER,
ADD COLUMN     "seekingSponsor" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cosmeticsJson" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "type" "InquiryType" NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "name" TEXT,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "tournamentId" TEXT,
    "sponsorId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Inquiry_type_status_idx" ON "Inquiry"("type", "status");

-- CreateIndex
CREATE INDEX "Inquiry_sponsorId_status_idx" ON "Inquiry"("sponsorId", "status");

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "SponsorTournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

