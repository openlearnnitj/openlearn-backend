-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'USER_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE 'SPECIALIZATION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SPECIALIZATION_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'SPECIALIZATION_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'COHORT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'COHORT_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'LEAGUE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'LEAGUE_DELETED';
