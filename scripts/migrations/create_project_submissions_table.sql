-- Migration to create project_submissions table
-- This should be run manually in production if the migration wasn't applied

CREATE TABLE IF NOT EXISTS project_submissions (
    submission_id SERIAL PRIMARY KEY,
    team_number INT NOT NULL,
    team_name VARCHAR(100) NOT NULL,

    -- Team Lead (mandatory)
    team_lead_name VARCHAR(100) NOT NULL,
    team_lead_email VARCHAR(150) NOT NULL,

    -- Member 2 (mandatory)
    member2_name VARCHAR(100) NOT NULL,
    member2_email VARCHAR(150) NOT NULL,

    -- Member 3 (optional)
    member3_name VARCHAR(100),
    member3_email VARCHAR(150),

    -- Member 4 (optional)
    member4_name VARCHAR(100),
    member4_email VARCHAR(150),

    project_title VARCHAR(200) NOT NULL,
    project_description TEXT NOT NULL,
    demo_youtube_link TEXT NOT NULL,
    github_url TEXT NOT NULL,
    deployed_url TEXT, -- Optional field
    submitted_at TIMESTAMP DEFAULT NOW()
);

-- Create index on team_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_project_submissions_team_number 
ON project_submissions(team_number);

-- Create index on submitted_at for faster ordering
CREATE INDEX IF NOT EXISTS idx_project_submissions_submitted_at 
ON project_submissions(submitted_at DESC);
