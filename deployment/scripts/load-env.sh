#!/bin/bash

# Load production environment variables
# This script exports all variables from .env.production for use with Docker Compose

if [ -f "environments/.env.production" ]; then
    echo "📋 Loading production environment variables..."
    export $(grep -v '^#' environments/.env.production | xargs)
    echo "✅ Environment variables loaded!"
    
    # Show some key variables (without secrets)
    echo "🔧 Key Configuration:"
    echo "   NODE_ENV: $NODE_ENV"
    echo "   POSTGRES_DB: $POSTGRES_DB"
    echo "   POSTGRES_USER: $POSTGRES_USER"
    echo "   CORS_ORIGIN: $CORS_ORIGIN"
    echo "   PORT: $PORT"
else
    echo "❌ Production environment file not found!"
    echo "Please ensure environments/.env.production exists"
    exit 1
fi
