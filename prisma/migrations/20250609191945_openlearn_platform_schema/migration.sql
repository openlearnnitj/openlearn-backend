/*
  Warnings:

  - You are about to drop the column `details` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `ipAddress` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `resource` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `resourceId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `_BlogPostToTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `achievements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `blog_posts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `comments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `course_progress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `courses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `donations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `follows` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `likes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `login_attempts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `password_resets` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `problem_solutions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `problems` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `project_submissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `projects` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `refresh_tokens` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `role_permissions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_achievements` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_profiles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_roles` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `userId` on table `audit_logs` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `action` on the `audit_logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `name` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('GRAND_PATHFINDER', 'CHIEF_PATHFINDER', 'PATHFINDER', 'PIONEER', 'LUMINARY');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('BLOG', 'VIDEO', 'ARTICLE', 'EXTERNAL_LINK');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('USER_CREATED', 'USER_APPROVED', 'USER_ROLE_CHANGED', 'SECTION_COMPLETED', 'BADGE_EARNED', 'SPECIALIZATION_COMPLETED', 'COHORT_CREATED', 'LEAGUE_CREATED', 'ASSIGNMENT_SUBMITTED');

-- DropForeignKey
ALTER TABLE "_BlogPostToTag" DROP CONSTRAINT "_BlogPostToTag_A_fkey";

-- DropForeignKey
ALTER TABLE "_BlogPostToTag" DROP CONSTRAINT "_BlogPostToTag_B_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "blog_posts" DROP CONSTRAINT "blog_posts_authorId_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_authorId_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_parentId_fkey";

-- DropForeignKey
ALTER TABLE "comments" DROP CONSTRAINT "comments_postId_fkey";

-- DropForeignKey
ALTER TABLE "course_progress" DROP CONSTRAINT "course_progress_courseId_fkey";

-- DropForeignKey
ALTER TABLE "course_progress" DROP CONSTRAINT "course_progress_userId_fkey";

-- DropForeignKey
ALTER TABLE "donations" DROP CONSTRAINT "donations_donorId_fkey";

-- DropForeignKey
ALTER TABLE "follows" DROP CONSTRAINT "follows_followerId_fkey";

-- DropForeignKey
ALTER TABLE "follows" DROP CONSTRAINT "follows_followingId_fkey";

-- DropForeignKey
ALTER TABLE "likes" DROP CONSTRAINT "like_blog_post_fkey";

-- DropForeignKey
ALTER TABLE "likes" DROP CONSTRAINT "like_comment_fkey";

-- DropForeignKey
ALTER TABLE "likes" DROP CONSTRAINT "likes_userId_fkey";

-- DropForeignKey
ALTER TABLE "login_attempts" DROP CONSTRAINT "login_attempts_userId_fkey";

-- DropForeignKey
ALTER TABLE "password_resets" DROP CONSTRAINT "password_resets_email_fkey";

-- DropForeignKey
ALTER TABLE "problem_solutions" DROP CONSTRAINT "problem_solutions_problemId_fkey";

-- DropForeignKey
ALTER TABLE "problem_solutions" DROP CONSTRAINT "problem_solutions_userId_fkey";

-- DropForeignKey
ALTER TABLE "project_submissions" DROP CONSTRAINT "project_submissions_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_submissions" DROP CONSTRAINT "project_submissions_studentId_fkey";

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_createdById_fkey";

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_userId_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT "role_permissions_roleId_fkey";

-- DropForeignKey
ALTER TABLE "user_achievements" DROP CONSTRAINT "user_achievements_achievementId_fkey";

-- DropForeignKey
ALTER TABLE "user_achievements" DROP CONSTRAINT "user_achievements_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_profiles" DROP CONSTRAINT "user_profiles_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_roleId_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_userId_fkey";

-- DropIndex
DROP INDEX "users_username_key";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "details",
DROP COLUMN "ipAddress",
DROP COLUMN "resource",
DROP COLUMN "resourceId",
DROP COLUMN "userAgent",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "metadata" JSONB,
ALTER COLUMN "userId" SET NOT NULL,
DROP COLUMN "action",
ADD COLUMN     "action" "AuditAction" NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "emailVerified",
DROP COLUMN "isActive",
DROP COLUMN "password",
DROP COLUMN "username",
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "githubUsername" TEXT,
ADD COLUMN     "kaggleUsername" TEXT,
ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'PIONEER',
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "twitterHandle" TEXT;

-- DropTable
DROP TABLE "_BlogPostToTag";

-- DropTable
DROP TABLE "achievements";

-- DropTable
DROP TABLE "blog_posts";

-- DropTable
DROP TABLE "comments";

-- DropTable
DROP TABLE "course_progress";

-- DropTable
DROP TABLE "courses";

-- DropTable
DROP TABLE "donations";

-- DropTable
DROP TABLE "follows";

-- DropTable
DROP TABLE "likes";

-- DropTable
DROP TABLE "login_attempts";

-- DropTable
DROP TABLE "password_resets";

-- DropTable
DROP TABLE "permissions";

-- DropTable
DROP TABLE "problem_solutions";

-- DropTable
DROP TABLE "problems";

-- DropTable
DROP TABLE "project_submissions";

-- DropTable
DROP TABLE "projects";

-- DropTable
DROP TABLE "refresh_tokens";

-- DropTable
DROP TABLE "role_permissions";

-- DropTable
DROP TABLE "roles";

-- DropTable
DROP TABLE "tags";

-- DropTable
DROP TABLE "user_achievements";

-- DropTable
DROP TABLE "user_profiles";

-- DropTable
DROP TABLE "user_roles";

-- DropEnum
DROP TYPE "Difficulty";

-- DropEnum
DROP TYPE "DonationStatus";

-- DropEnum
DROP TYPE "Gender";

-- DropEnum
DROP TYPE "LikeType";

-- DropEnum
DROP TYPE "PostStatus";

-- DropEnum
DROP TYPE "SolutionStatus";

-- DropEnum
DROP TYPE "SubmissionStatus";

-- CreateTable
CREATE TABLE "cohorts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cohorts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specializations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cohortId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specializations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leagues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialization_leagues" (
    "id" SERIAL NOT NULL,
    "specializationId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "specialization_leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weeks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "leagueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "weekId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_resources" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "ResourceType" NOT NULL,
    "order" INTEGER NOT NULL,
    "sectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "section_resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "leagueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_submissions" (
    "id" TEXT NOT NULL,
    "content" TEXT,
    "fileUrl" TEXT,
    "githubUrl" TEXT,
    "liveUrl" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "assignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "section_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "personalNote" TEXT,
    "markedForRevision" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "section_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "leagueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_specializations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specializationId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_specializations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "specialization_leagues_specializationId_leagueId_key" ON "specialization_leagues"("specializationId", "leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "weeks_leagueId_order_key" ON "weeks"("leagueId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "sections_weekId_order_key" ON "sections"("weekId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "section_resources_sectionId_order_key" ON "section_resources"("sectionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_leagueId_key" ON "assignments"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_submissions_assignmentId_userId_key" ON "assignment_submissions"("assignmentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_userId_cohortId_leagueId_key" ON "enrollments"("userId", "cohortId", "leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "section_progress_userId_sectionId_key" ON "section_progress"("userId", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_userId_badgeId_key" ON "user_badges"("userId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "user_specializations_userId_specializationId_key" ON "user_specializations"("userId", "specializationId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specializations" ADD CONSTRAINT "specializations_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialization_leagues" ADD CONSTRAINT "specialization_leagues_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "specializations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialization_leagues" ADD CONSTRAINT "specialization_leagues_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weeks" ADD CONSTRAINT "weeks_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_resources" ADD CONSTRAINT "section_resources_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "cohorts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_progress" ADD CONSTRAINT "section_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "section_progress" ADD CONSTRAINT "section_progress_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_specializations" ADD CONSTRAINT "user_specializations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_specializations" ADD CONSTRAINT "user_specializations_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "specializations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
