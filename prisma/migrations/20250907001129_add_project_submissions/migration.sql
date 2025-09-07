-- CreateTable
CREATE TABLE "public"."project_submissions" (
    "submission_id" SERIAL NOT NULL,
    "team_number" INTEGER NOT NULL,
    "team_name" VARCHAR(100) NOT NULL,
    "team_lead_name" VARCHAR(100) NOT NULL,
    "team_lead_email" VARCHAR(150) NOT NULL,
    "member2_name" VARCHAR(100) NOT NULL,
    "member2_email" VARCHAR(150) NOT NULL,
    "member3_name" VARCHAR(100),
    "member3_email" VARCHAR(150),
    "member4_name" VARCHAR(100),
    "member4_email" VARCHAR(150),
    "project_title" VARCHAR(200) NOT NULL,
    "project_description" TEXT NOT NULL,
    "demo_youtube_link" TEXT NOT NULL,
    "github_url" TEXT NOT NULL,
    "deployed_url" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_submissions_pkey" PRIMARY KEY ("submission_id")
);
