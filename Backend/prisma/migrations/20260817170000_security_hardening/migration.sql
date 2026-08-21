-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaRecoveryCodes" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "mfaSecret" TEXT,
ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "DepositBinding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepositBinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthThrottle" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "failCount" INTEGER NOT NULL DEFAULT 0,
    "lastFailAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedUntil" TIMESTAMP(3),

    CONSTRAINT "AuthThrottle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DepositBinding_address_key" ON "DepositBinding"("address");

-- CreateIndex
CREATE INDEX "DepositBinding_userId_idx" ON "DepositBinding"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthThrottle_scope_identifier_key" ON "AuthThrottle"("scope", "identifier");

-- CreateIndex
CREATE INDEX "EmailVerification_userId_idx" ON "EmailVerification"("userId");

-- AddForeignKey
ALTER TABLE "DepositBinding" ADD CONSTRAINT "DepositBinding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerification" ADD CONSTRAINT "EmailVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

