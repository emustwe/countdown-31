-- CreateEnum
CREATE TYPE "TournamentBrand" AS ENUM ('WM', 'VA');

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "brand" "TournamentBrand" NOT NULL DEFAULT 'WM';
