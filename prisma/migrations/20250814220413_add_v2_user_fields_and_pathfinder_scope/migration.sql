/*
  Warnings:

  - A unique constraint covering the columns `[olid]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "cohorts" ADD COLUMN     "autoApprove" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxEnrollments" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "currentCohortId" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "discordUsername" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "graduationYear" INTEGER,
ADD COLUMN     "institute" TEXT,
ADD COLUMN     "migratedToV2" BOOLEAN,
ADD COLUMN     "olid" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "portfolioUrl" TEXT,
ADD COLUMN     "studentId" TEXT;

-- CreateTable
CREATE TABLE "pathfinder_scopes" (
    "id" TEXT NOT NULL,
    "pathfinderId" TEXT NOT NULL,
    "cohortId" TEXT,
    "specializationId" TEXT,
    "leagueId" TEXT,
    "canManageUsers" BOOLEAN NOT NULL DEFAULT true,
    "canViewAnalytics" BOOLEAN NOT NULL DEFAULT true,
    "canCreateContent" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT NOT NULL,

    CONSTRAINT "pathfinder_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pathfinder_scopes_pathfinderId_cohortId_specializationId_le_key" ON "pathfinder_scopes"("pathfinderId", "cohortId", "specializationId", "leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "users_olid_key" ON "users"("olid");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_currentCohortId_fkey" FOREIGN KEY ("currentCohortId") REFERENCES "cohorts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathfinder_scopes" ADD CONSTRAINT "pathfinder_scopes_pathfinderId_fkey" FOREIGN KEY ("pathfinderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathfinder_scopes" ADD CONSTRAINT "pathfinder_scopes_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathfinder_scopes" ADD CONSTRAINT "pathfinder_scopes_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "specializations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathfinder_scopes" ADD CONSTRAINT "pathfinder_scopes_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pathfinder_scopes" ADD CONSTRAINT "pathfinder_scopes_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
