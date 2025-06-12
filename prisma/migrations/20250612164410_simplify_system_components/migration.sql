/*
  Warnings:

  - The values [FILE_STORAGE,BACKGROUND_JOBS,EXTERNAL_SERVICES] on the enum `SystemComponent` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SystemComponent_new" AS ENUM ('API', 'DATABASE', 'AUTHENTICATION');
ALTER TABLE "status_checks" ALTER COLUMN "component" TYPE "SystemComponent_new" USING ("component"::text::"SystemComponent_new");
ALTER TABLE "status_incidents" ALTER COLUMN "component" TYPE "SystemComponent_new" USING ("component"::text::"SystemComponent_new");
ALTER TYPE "SystemComponent" RENAME TO "SystemComponent_old";
ALTER TYPE "SystemComponent_new" RENAME TO "SystemComponent";
DROP TYPE "SystemComponent_old";
COMMIT;
