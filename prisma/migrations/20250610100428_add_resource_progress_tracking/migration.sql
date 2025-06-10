-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'RESOURCE_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'RESOURCE_MARKED_FOR_REVISION';

-- CreateTable
CREATE TABLE "resource_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "personalNote" TEXT,
    "markedForRevision" BOOLEAN NOT NULL DEFAULT false,
    "timeSpent" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resource_progress_userId_resourceId_key" ON "resource_progress"("userId", "resourceId");

-- AddForeignKey
ALTER TABLE "resource_progress" ADD CONSTRAINT "resource_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_progress" ADD CONSTRAINT "resource_progress_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "section_resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
