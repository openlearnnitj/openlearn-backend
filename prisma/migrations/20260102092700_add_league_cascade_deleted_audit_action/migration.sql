-- AlterEnum
-- Add LEAGUE_CASCADE_DELETED to AuditAction enum for tracking cascade deletions

ALTER TYPE "AuditAction" ADD VALUE 'LEAGUE_CASCADE_DELETED';
