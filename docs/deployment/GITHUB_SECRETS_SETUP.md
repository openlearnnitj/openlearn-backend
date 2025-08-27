# GitHub Secrets Setup Guide

This document explains how to set up the required GitHub secrets for the OpenLearn CI/CD pipeline.

## Required Secrets

The following secrets must be configured in your GitHub repository settings:

### 1. `EC2_HOST`
- **Description**: The public IP address or domain name of your EC2 instance
- **Example**: `54.123.456.789` or `your-domain.com`
- **Usage**: Used to connect to your server for deployment
- **How to find**: 
  - Go to AWS EC2 Console
  - Select your instance
  - Copy the "Public IPv4 address" or "Public IPv4 DNS"

### 2. `EC2_USER`
- **Description**: The SSH username for your EC2 instance
- **Common values**:
  - `ubuntu` (for Ubuntu AMI)
  - `ec2-user` (for Amazon Linux AMI)
  - `admin` (for Debian AMI)
  - `centos` (for CentOS AMI)
- **Usage**: Used for SSH authentication during deployment
- **How to determine**: Check your EC2 instance's AMI documentation or try connecting manually

### 3. `EC2_PRIVATE_KEY`
- **Description**: The private key content for SSH access to your EC2 instance
- **Format**: The entire content of your `.pem` file
- **Usage**: Used for SSH authentication during deployment
- **How to get**:
  ```bash
  # If you have the .pem file, get its content:
  cat /path/to/your-key.pem
  ```
- **Important**: Include the entire key including the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines

## How to Set Up GitHub Secrets

1. **Navigate to Repository Settings**:
   - Go to your GitHub repository
   - Click on "Settings" tab
   - Click on "Secrets and variables" → "Actions"

2. **Add Each Secret**:
   - Click "New repository secret"
   - Enter the secret name exactly as shown above
   - Paste the secret value
   - Click "Add secret"

3. **Verify Setup**:
   - All three secrets should appear in your secrets list
   - Secret values are hidden for security

## Testing Your Setup

### 1. Test SSH Connection Manually
Before relying on the CI/CD pipeline, test your SSH connection:

```bash
# Replace with your actual values
ssh -i /path/to/your-key.pem ubuntu@your-ec2-ip

# If successful, you should connect to your server
```

### 2. Test EC2_USER Value
The most common issue is using the wrong `EC2_USER`. Try these values:

```bash
# For Ubuntu instances
ssh -i your-key.pem ubuntu@your-ec2-ip

# For Amazon Linux instances  
ssh -i your-key.pem ec2-user@your-ec2-ip

# For Debian instances
ssh -i your-key.pem admin@your-ec2-ip
```

### 3. Validate Key Format
Your private key should look like this:
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdef...
[multiple lines of encoded key data]
...xyz789
-----END RSA PRIVATE KEY-----
```

## Common Issues and Solutions

### Issue: "Unrecognized named-value: 'secrets'"
- **Cause**: Using secrets in unsupported YAML contexts
- **Solution**: Only use secrets in `with:`, `env:`, or `run:` contexts
- **Fixed**: The environment URL issue has been resolved in the workflows

### Issue: "Permission denied (publickey)"
- **Cause**: Wrong EC2_USER or EC2_PRIVATE_KEY
- **Solutions**:
  1. Verify the correct username for your AMI type
  2. Ensure the private key is complete and correctly formatted
  3. Check that the key pair matches your EC2 instance

### Issue: "Host key verification failed"
- **Cause**: SSH host key checking
- **Solution**: The workflow includes `ssh-keyscan` to add the host key automatically

### Issue: "Connection refused"
- **Cause**: Incorrect EC2_HOST or server not running
- **Solutions**:
  1. Verify the IP address is correct and public
  2. Check security groups allow SSH (port 22) and HTTP (port 3000)
  3. Ensure the instance is running

## Security Best Practices

1. **Least Privilege**: Only give the deployment key access to necessary directories
2. **Key Rotation**: Regularly rotate your SSH keys
3. **Monitoring**: Monitor deployment logs for unusual activity
4. **Backup**: Keep secure backups of your private keys
5. **Environment Separation**: Use different keys for staging and production

## Server Preparation

Your EC2 server should have:

1. **Docker and Docker Compose installed**:
   ```bash
   sudo apt update
   sudo apt install docker.io docker-compose-plugin -y
   sudo usermod -aG docker $USER
   ```

2. **Git configured**:
   ```bash
   git config --global user.name "Deployment Bot"
   git config --global user.email "deploy@yourdomain.com"
   ```

3. **Application directory**:
   ```bash
   # Clone your repository to /home/ubuntu/openlearn-backend
   cd /home/ubuntu
   git clone https://github.com/yourusername/openlearn-backend.git
   cd openlearn-backend
   ```

4. **Environment variables**:
   - Create `.env` file with production settings
   - Ensure database credentials are set

## Workflow Behavior

- **Main Branch**: Runs tests and deploys to production
- **Develop Branch**: Runs tests only (no deployment)
- **Pull Requests**: Runs validation and tests with detailed feedback

## Troubleshooting Commands

Run these on your server to debug deployment issues:

```bash
# Check Docker containers
docker ps -a

# Check application logs
docker-compose logs app

# Check database logs  
docker-compose logs db

# Test application health
curl http://localhost:3000/health

# Check disk space (common deployment failure cause)
df -h

# Clean up Docker (if space issues)
docker system prune -f
```

For more help, check the `scripts/troubleshoot.sh` script in the repository.
