-- CreateEnum
CREATE TYPE "CryptoDirection" AS ENUM ('DEPOSIT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "CryptoTransferStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Wallet" ALTER COLUMN "currency" SET DEFAULT 'USDT';

-- CreateTable
CREATE TABLE "CryptoTransfer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" "CryptoDirection" NOT NULL,
    "amount" BIGINT NOT NULL,
    "asset" TEXT NOT NULL DEFAULT 'USDT',
    "network" TEXT NOT NULL DEFAULT 'SOLANA',
    "address" TEXT NOT NULL,
    "destinationType" TEXT NOT NULL DEFAULT 'SOLANA',
    "txSignature" TEXT,
    "status" "CryptoTransferStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CryptoTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CryptoTransfer_userId_createdAt_idx" ON "CryptoTransfer"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "CryptoTransfer" ADD CONSTRAINT "CryptoTransfer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
