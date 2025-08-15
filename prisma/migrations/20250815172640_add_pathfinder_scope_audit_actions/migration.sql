-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'PATHFINDER_SCOPE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'PATHFINDER_SCOPE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'PATHFINDER_SCOPE_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'PATHFINDER_SCOPE_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'PATHFINDER_SCOPE_PERMISSION_CHECKED';
ALTER TYPE "AuditAction" ADD VALUE 'USER_MIGRATED_TO_V2';
