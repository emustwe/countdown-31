-- DropForeignKey
ALTER TABLE "GameRound" DROP CONSTRAINT "GameRound_userId_fkey";

-- DropForeignKey
ALTER TABLE "GameRound" DROP CONSTRAINT "GameRound_walletId_fkey";

-- DropForeignKey
ALTER TABLE "Spin" DROP CONSTRAINT "Spin_roundId_fkey";

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spin" ADD CONSTRAINT "Spin_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
