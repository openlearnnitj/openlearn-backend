-- CreateEnum
CREATE TYPE "EmailCategory" AS ENUM ('WELCOME', 'NOTIFICATION', 'MARKETING', 'SYSTEM', 'COURSE_UPDATE', 'ACHIEVEMENT', 'ADMIN', 'REMINDER');

-- CreateEnum
CREATE TYPE "EmailRecipientType" AS ENUM ('INDIVIDUAL', 'ROLE_BASED', 'COHORT_BASED', 'LEAGUE_BASED', 'ALL_USERS', 'CUSTOM_LIST');

-- CreateEnum
CREATE TYPE "EmailJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED', 'OPENED', 'CLICKED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "EmailAuditAction" AS ENUM ('TEMPLATE_CREATED', 'TEMPLATE_UPDATED', 'TEMPLATE_DELETED', 'EMAIL_SENT', 'EMAIL_FAILED', 'EMAIL_OPENED', 'EMAIL_CLICKED', 'EMAIL_BOUNCED', 'EMAIL_UNSUBSCRIBED', 'BULK_EMAIL_STARTED', 'BULK_EMAIL_COMPLETED', 'BULK_EMAIL_FAILED', 'SETTINGS_UPDATED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'EMAIL_TEMPLATE_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'EMAIL_TEMPLATE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'EMAIL_TEMPLATE_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'EMAIL_SENT';
ALTER TYPE "AuditAction" ADD VALUE 'EMAIL_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'BULK_EMAIL_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'BULK_EMAIL_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'BULK_EMAIL_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'EMAIL_SETTINGS_UPDATED';

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "variables" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "category" "EmailCategory" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_jobs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "templateId" TEXT,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "textContent" TEXT,
    "recipientType" "EmailRecipientType" NOT NULL,
    "recipients" JSONB NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "roleFilter" "UserRole",
    "cohortFilter" TEXT,
    "leagueFilter" TEXT,
    "statusFilter" "UserStatus",
    "status" "EmailJobStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "email_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "messageId" TEXT,
    "providerData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_settings" (
    "id" TEXT NOT NULL,
    "smtpHost" TEXT NOT NULL,
    "smtpPort" INTEGER NOT NULL,
    "smtpUser" TEXT NOT NULL,
    "smtpPassword" TEXT NOT NULL,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT true,
    "fromName" TEXT NOT NULL DEFAULT 'OpenLearn Platform',
    "fromEmail" TEXT NOT NULL,
    "replyToEmail" TEXT,
    "maxEmailsPerHour" INTEGER NOT NULL DEFAULT 100,
    "maxEmailsPerMinute" INTEGER NOT NULL DEFAULT 10,
    "batchSize" INTEGER NOT NULL DEFAULT 10,
    "trackOpens" BOOLEAN NOT NULL DEFAULT true,
    "trackClicks" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "EmailAuditAction" NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "templateId" TEXT,
    "jobId" TEXT,
    "emailLogId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_name_key" ON "email_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "email_jobs_jobId_key" ON "email_jobs"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "email_logs_jobId_recipientId_key" ON "email_logs"("jobId", "recipientId");

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_jobs" ADD CONSTRAINT "email_jobs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "email_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_jobs" ADD CONSTRAINT "email_jobs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "email_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_audit_logs" ADD CONSTRAINT "email_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
