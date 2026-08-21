-- CreateEnum
CREATE TYPE "RebuyStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "RebuyRequest" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" "RebuyStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,

    CONSTRAINT "RebuyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RebuyRequest_tournamentId_status_idx" ON "RebuyRequest"("tournamentId", "status");

-- CreateIndex
CREATE INDEX "RebuyRequest_userId_status_idx" ON "RebuyRequest"("userId", "status");

-- AddForeignKey
ALTER TABLE "RebuyRequest" ADD CONSTRAINT "RebuyRequest_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RebuyRequest" ADD CONSTRAINT "RebuyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
