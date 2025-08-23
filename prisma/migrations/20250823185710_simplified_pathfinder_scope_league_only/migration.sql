/*
  Warnings:

  - You are about to drop the column `cohortId` on the `pathfinder_scopes` table. All the data in the column will be lost.
  - You are about to drop the column `specializationId` on the `pathfinder_scopes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[pathfinderId,leagueId]` on the table `pathfinder_scopes` will be added. If there are existing duplicate values, this will fail.
  - Made the column `leagueId` on table `pathfinder_scopes` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "pathfinder_scopes" DROP CONSTRAINT "pathfinder_scopes_cohortId_fkey";

-- DropForeignKey
ALTER TABLE "pathfinder_scopes" DROP CONSTRAINT "pathfinder_scopes_specializationId_fkey";

-- DropIndex
DROP INDEX "pathfinder_scopes_pathfinderId_cohortId_specializationId_le_key";

-- AlterTable
ALTER TABLE "pathfinder_scopes" DROP COLUMN "cohortId",
DROP COLUMN "specializationId",
ALTER COLUMN "leagueId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "pathfinder_scopes_pathfinderId_leagueId_key" ON "pathfinder_scopes"("pathfinderId", "leagueId");
