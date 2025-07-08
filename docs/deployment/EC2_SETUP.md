# EC2 Instance Setup Guide

This guide will walk you through the process of setting up an AWS EC2 instance to host the OpenLearn backend.

## 1. Launch an EC2 Instance

1.  **Choose an Amazon Machine Image (AMI):** Select the **Ubuntu Server 22.04 LTS (HVM), SSD Volume Type** AMI.
2.  **Choose an Instance Type:** Select the **t3.micro** instance type.
3.  **Configure Instance Details:** Leave the default settings.
4.  **Add Storage:** The default 8 GB is sufficient.
5.  **Add Tags:** Add a `Name` tag to easily identify your instance.
6.  **Configure Security Group:** Create a new security group with the following inbound rules:
    *   **SSH:** TCP, Port 22, Source: My IP
    *   **HTTP:** TCP, Port 80, Source: Anywhere
    *   **HTTPS:** TCP, Port 443, Source: Anywhere
7.  **Review and Launch:** Review your instance details and launch the instance.
8.  **Create a new key pair:** Create a new key pair and download the `.pem` file. You will need this to connect to your instance.

## 2. Connect to Your Instance

1.  **Open a terminal** and navigate to the directory where you downloaded the `.pem` file.
2.  **Change the permissions** of the `.pem` file:
    ```bash
    chmod 400 <your-key-pair-name>.pem
    ```
3.  **Connect to your instance** using the following command:
    ```bash
    ssh -i <your-key-pair-name>.pem ubuntu@<your-instance-public-dns>
    ```

## 3. Automated EC2 Setup

1.  **Connect to your instance** as described in Section 2.
2.  **Run the automated setup script:**
    ```bash
    bash scripts/setup_ec2_micro.sh
    ```
    This script will:
    *   Update system packages.
    *   Install Node.js, npm, Docker, Docker Compose, and Git.
    *   Configure the UFW firewall.
    *   Clone the OpenLearn backend repository to `/home/ubuntu/openlearn-backend`.
    *   Create a `.env` file from `.env.example`.

    **Important:** After this script runs, you will be prompted to log out and log back in to apply Docker group changes. Please do so before proceeding.

## 4. Configure Environment Variables

1.  **Navigate to the project directory:**
    ```bash
    cd /home/ubuntu/openlearn-backend
    ```
2.  **Edit the `.env` file** and fill in the required values, especially `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `CORS_ORIGIN` (your domain, e.g., `https://yourdomain.com`):
    ```bash
    nano .env
    ```

## 5. Configure Nginx and SSL

1.  **Run the Nginx and SSL setup script:**
    ```bash
    bash scripts/setup_nginx.sh
    ```
    This script will:
    *   Install Nginx.
    *   Configure Nginx as a reverse proxy for your application using the `CORS_ORIGIN` from your `.env` file.
    *   Install Certbot.
    *   Obtain and configure an SSL certificate for your domain.

    **Note:** Ensure your DNS records are pointing to your EC2 instance's public IP address before running this script for SSL to work correctly.

## 6. Deploy the Application

1.  **Run the deployment script:**
    ```bash
    bash scripts/deploy.sh
    ```
    This script will pull the latest code, install dependencies, build the application, restart Docker containers, and run database migrations.

## 7. Set Up Automated Tasks (Optional)

1.  **Run the cron job setup script:**
    ```bash
    bash scripts/setup_cron_jobs.sh
    ```
    This script will set up cron jobs for daily database backups and regular system monitoring.

## 8. Monitor Your Application

1.  **Run the monitoring script:**
    ```bash
    bash scripts/monitor.sh
    ```
    This script provides a quick overview of system resources, Docker container status, application logs, and health checks.