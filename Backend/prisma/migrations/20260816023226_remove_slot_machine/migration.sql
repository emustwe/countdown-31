-- DropForeignKey
ALTER TABLE "GameRound" DROP CONSTRAINT "GameRound_userId_fkey";

-- DropForeignKey
ALTER TABLE "GameRound" DROP CONSTRAINT "GameRound_walletId_fkey";

-- DropForeignKey
ALTER TABLE "Spin" DROP CONSTRAINT "Spin_roundId_fkey";

-- DropTable
DROP TABLE "AuditLog";

-- DropTable
DROP TABLE "GameConfig";

-- DropTable
DROP TABLE "GameRound";

-- DropTable
DROP TABLE "Spin";

-- DropEnum
DROP TYPE "GameRoundState";

