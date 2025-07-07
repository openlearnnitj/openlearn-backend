#!/bin/bash

# Fix Git Configuration for OpenLearn Backend
# This script fixes the git configuration on the EC2 server to use 'main' instead of 'master'

set -e

echo "🔧 Fixing Git Configuration for OpenLearn Backend"
echo "================================================"

# Change to the application directory
cd /home/ubuntu/openlearn-backend || { 
    echo "❌ Application directory not found. Please ensure the application is deployed to /home/ubuntu/openlearn-backend"
    exit 1
}

echo "📍 Current directory: $(pwd)"

# Check current git configuration
echo "📋 Current git configuration:"
git remote -v
echo ""

# Check current branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
echo "📍 Current branch: $current_branch"

# Check if we're on master branch
if [ "$current_branch" = "master" ]; then
    echo "⚠️  Currently on master branch. Switching to main..."
    
    # Fetch all branches
    git fetch --all
    
    # Check if main branch exists
    if git show-ref --verify --quiet refs/remotes/origin/main; then
        echo "✅ Main branch exists on remote"
        
        # Create local main branch if it doesn't exist
        if ! git show-ref --verify --quiet refs/heads/main; then
            echo "🔄 Creating local main branch..."
            git checkout -b main origin/main
        else
            echo "🔄 Switching to main branch..."
            git checkout main
            git pull origin main
        fi
        
        echo "✅ Successfully switched to main branch"
    else
        echo "❌ Main branch not found on remote"
        exit 1
    fi
elif [ "$current_branch" = "main" ]; then
    echo "✅ Already on main branch"
    
    # Ensure we're up to date
    git pull origin main
else
    echo "📍 Currently on branch: $current_branch"
    echo "🔄 Switching to main branch..."
    git checkout main
    git pull origin main
fi

# Set main as the default branch for future pulls
echo "🔧 Setting main as default branch..."
git config branch.main.remote origin
git config branch.main.merge refs/heads/main

# Set the default branch for new repositories (if git version supports it)
git config --global init.defaultBranch main 2>/dev/null || echo "ℹ️  Could not set global default branch (older git version)"

echo ""
echo "✅ Git configuration fixed!"
echo "📋 Summary:"
echo "   - Current branch: $(git rev-parse --abbrev-ref HEAD)"
echo "   - Remote URL: $(git config --get remote.origin.url)"
echo "   - Default remote: $(git config --get branch.main.remote 2>/dev/null || echo 'Not set')"
echo "   - Default merge: $(git config --get branch.main.merge 2>/dev/null || echo 'Not set')"
echo ""
echo "🔄 Next deployment should now use the main branch correctly."
