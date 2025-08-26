#!/bin/bash

# OpenLearn CI/CD Setup Helper
# This script helps you set up the required GitHub secrets for the CI/CD pipeline

echo "🚀 OpenLearn CI/CD Setup Helper"
echo "================================"
echo ""

echo "This script will help you set up the required GitHub secrets."
echo "You'll need to add these secrets manually in GitHub:"
echo "Settings → Secrets and variables → Actions → New repository secret"
echo ""

# Check if GitHub CLI is installed
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI detected - you can use 'gh secret set' commands"
    USE_GH_CLI=true
else
    echo "ℹ️  GitHub CLI not found - will provide manual instructions"
    USE_GH_CLI=false
fi

echo ""
echo "📋 Required Secrets:"
echo ""

# EC2_PRIVATE_KEY
echo "1. 🔑 EC2_PRIVATE_KEY"
echo "   Description: Private SSH key for EC2 server access"
echo "   Value: Content of your private key file (e.g., ~/.ssh/id_rsa)"
echo ""

if [ -f ~/.ssh/id_rsa ]; then
    echo "   Found private key at ~/.ssh/id_rsa"
    if [ "$USE_GH_CLI" = true ]; then
        echo "   Command: gh secret set EC2_PRIVATE_KEY < ~/.ssh/id_rsa"
    else
        echo "   Copy this content: cat ~/.ssh/id_rsa"
    fi
else
    echo "   ⚠️  No private key found at ~/.ssh/id_rsa"
    echo "   Create one with: ssh-keygen -t rsa -b 4096"
fi

echo ""

# EC2_HOST
echo "2. 🌐 EC2_HOST"
echo "   Description: EC2 server IP address or domain name"
echo "   Value: Your server's public IP or domain"
echo ""

# Try to detect current server IP if running on EC2
if command -v curl &> /dev/null; then
    PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null)
    if [ -n "$PUBLIC_IP" ]; then
        echo "   Detected EC2 public IP: $PUBLIC_IP"
        if [ "$USE_GH_CLI" = true ]; then
            echo "   Command: gh secret set EC2_HOST --body '$PUBLIC_IP'"
        else
            echo "   Use this value: $PUBLIC_IP"
        fi
    else
        echo "   Example: 203.0.113.123 or yourdomain.com"
        if [ "$USE_GH_CLI" = true ]; then
            echo "   Command: gh secret set EC2_HOST --body 'YOUR_SERVER_IP'"
        fi
    fi
else
    echo "   Example: 203.0.113.123 or yourdomain.com"
fi

echo ""

# EC2_USER
echo "3. 👤 EC2_USER"
echo "   Description: SSH username for EC2 server"
echo "   Value: Usually 'ubuntu' for Ubuntu servers, 'ec2-user' for Amazon Linux"
echo ""

CURRENT_USER=$(whoami)
echo "   Current user: $CURRENT_USER"
if [ "$USE_GH_CLI" = true ]; then
    echo "   Command: gh secret set EC2_USER --body '$CURRENT_USER'"
else
    echo "   Use this value: $CURRENT_USER"
fi

echo ""
echo "🔧 Setup Steps:"
echo ""

if [ "$USE_GH_CLI" = true ]; then
    echo "Using GitHub CLI (recommended):"
    echo ""
    echo "1. Login to GitHub CLI:"
    echo "   gh auth login"
    echo ""
    echo "2. Set secrets:"
    if [ -f ~/.ssh/id_rsa ]; then
        echo "   gh secret set EC2_PRIVATE_KEY < ~/.ssh/id_rsa"
    else
        echo "   gh secret set EC2_PRIVATE_KEY --body 'PASTE_YOUR_PRIVATE_KEY_HERE'"
    fi
    
    if [ -n "$PUBLIC_IP" ]; then
        echo "   gh secret set EC2_HOST --body '$PUBLIC_IP'"
    else
        echo "   gh secret set EC2_HOST --body 'YOUR_SERVER_IP'"
    fi
    
    echo "   gh secret set EC2_USER --body '$CURRENT_USER'"
    
else
    echo "Manual setup via GitHub web interface:"
    echo ""
    echo "1. Go to your GitHub repository"
    echo "2. Click Settings → Secrets and variables → Actions"
    echo "3. Click 'New repository secret'"
    echo "4. Add each secret with the name and value shown above"
fi

echo ""
echo "🧪 Testing the Setup:"
echo ""
echo "1. Push a commit to the 'develop' branch to test basic pipeline"
echo "2. Create a pull request from 'develop' to 'main' to test PR validation"
echo "3. Merge the PR to test production deployment"
echo ""

echo "📋 Verification Checklist:"
echo ""
echo "□ SSH key pair created and added to EC2 server"
echo "□ All three secrets added to GitHub repository"
echo "□ EC2 server has OpenLearn backend repository cloned"
echo "□ EC2 server has Docker and Docker Compose installed"
echo "□ Environment variables (.env) configured on server"
echo ""

echo "🔗 Useful Commands:"
echo ""
echo "Test SSH connection:"
if [ -n "$PUBLIC_IP" ]; then
    echo "   ssh $CURRENT_USER@$PUBLIC_IP"
else
    echo "   ssh $CURRENT_USER@YOUR_SERVER_IP"
fi
echo ""
echo "Check GitHub secrets:"
if [ "$USE_GH_CLI" = true ]; then
    echo "   gh secret list"
fi
echo ""
echo "View GitHub Actions:"
echo "   https://github.com/YOUR_USERNAME/openlearn-backend/actions"
echo ""

echo "✅ Setup complete! Your CI/CD pipeline should now work."
echo "🚀 Push to 'develop' or create a PR to test it!"
