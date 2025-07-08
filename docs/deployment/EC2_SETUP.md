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

## 3. Install Dependencies

1.  **Update the package list:**
    ```bash
    sudo apt update
    ```
2.  **Install Node.js and npm:**
    ```bash
    sudo apt install -y nodejs npm
    ```
3.  **Install Docker and Docker Compose:**
    ```bash
    sudo apt install -y docker.io
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    ```
4.  **Install Git:**
    ```bash
    sudo apt install -y git
    ```

## 4. Clone the Repository

1.  **Clone the repository** to your home directory:
    ```bash
    git clone https://github.com/openlearnnitj/openlearn-backend.git
    ```

## 5. Configure Environment Variables

1.  **Navigate to the project directory:**
    ```bash
    cd openlearn-backend
    ```
2.  **Create a `.env` file** by copying the example file:
    ```bash
    cp .env.example .env
    ```
3.  **Edit the `.env` file** and fill in the required values:
    ```bash
    nano .env
    ```

## 6. Deploy the Application

1.  **Run the deployment script:**
    ```bash
    bash scripts/deploy.sh
    ```

## 7. Configure Nginx as a Reverse Proxy (Optional)

If you want to use a custom domain and SSL, you can configure Nginx as a reverse proxy.

1.  **Install Nginx:**
    ```bash
    sudo apt install -y nginx
    ```
2.  **Create a new Nginx configuration file:**
    ```bash
    sudo nano /etc/nginx/sites-available/openlearn
    ```
3.  **Add the following configuration** to the file, replacing `your_domain` with your actual domain name:
    ```nginx
    server {
        listen 80;
        server_name your_domain www.your_domain;

        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```
4.  **Enable the new configuration:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/openlearn /etc/nginx/sites-enabled
    ```
5.  **Test the Nginx configuration:**
    ```bash
    sudo nginx -t
    ```
6.  **Restart Nginx:**
    ```bash
    sudo systemctl restart nginx
    ```

## 8. Configure SSL with Certbot (Optional)

1.  **Install Certbot:**
    ```bash
    sudo apt install -y certbot python3-certbot-nginx
    ```
2.  **Obtain an SSL certificate:**
    ```bash
    sudo certbot --nginx -d your_domain -d www.your_domain
    ```