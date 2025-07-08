# Gemini Deployment Simplification Roadmap

This document outlines the steps to simplify the deployment and CI/CD processes for the OpenLearn backend.

## Milestones

- [x] **Phase 1: Analysis and Cleanup**
    - [x] Analyze existing deployment scripts and CI/CD workflows.
    - [x] Identify and remove unused and overly complex scripts and workflows.
    - [x] Remove Redis dependency from the application.

- [x] **Phase 2: Simplified Dockerization**
    - [x] Create a new `docker-compose.yml` for the Express app and PostgreSQL.
    - [x] Create a new `Dockerfile` for the Express app.
    - [x] Create a `.dockerignore` file.

- [x] **Phase 3: Simplified CI/CD**
    - [x] Create a new GitHub Actions workflow for CI.
    - [x] Create a new GitHub Actions workflow for CD (deployment to EC2).

- [x] **Phase 4: Deployment Scripts**
    - [x] Create a new set of simple deployment scripts.

- [x] **Phase 5: Documentation**
    - [x] Create `docs/deployment/EC2_SETUP.md` with detailed EC2 setup instructions.
    - [x] Create `docs/deployment/CI_CD_GUIDE.md` with detailed CI/CD setup instructions.

- [x] **Phase 6: Final Cleanup**
    - [x] Remove all old and unnecessary files and folders.