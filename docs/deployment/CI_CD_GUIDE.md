# CI/CD Setup Guide

This guide will walk you through the process of setting up a CI/CD pipeline for the OpenLearn backend using GitHub Actions.

## 1. Prerequisites

*   An AWS EC2 instance set up according to the `EC2_SETUP.md` guide.
*   A GitHub repository for the OpenLearn backend.

## 2. Configure GitHub Secrets

1.  **Open your GitHub repository** and go to **Settings > Secrets and variables > Actions**.
2.  **Create the following secrets:**
    *   `EC2_HOST`: The public IP address of your EC2 instance.
    *   `EC2_USER`: The username for your EC2 instance (e.g., `ubuntu`).
    *   `EC2_PRIVATE_KEY`: The private key for your EC2 instance. You can get this from the `.pem` file you downloaded when you created the instance.

## 3. Create the CI/CD Workflow

1.  **Create a new file** in your repository at `.github/workflows/main.yml`.
2.  **Copy the contents** of the `main.yml` file from the root of the repository into this new file.

## 4. Push to GitHub

Once you push your changes to the `main` branch, the CI/CD workflow will automatically run. It will first run the tests, and if they pass, it will deploy the application to your EC2 instance.