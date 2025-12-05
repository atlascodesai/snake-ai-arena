#!/bin/bash
# Deploy to Railway with private submodule content
# Usage: ./deploy.sh [environment]
# Default environment: preview

ENV=${1:-preview}

echo "Deploying to Railway ($ENV)..."

# Temporarily hide submodule .git so railway up includes the actual files
if [ -f "src/private/.git" ]; then
    mv src/private/.git src/private/.git.backup
    echo "Prepared private submodule for upload"
fi

# Deploy
railway up --environment "$ENV"

# Restore submodule .git
if [ -f "src/private/.git.backup" ]; then
    mv src/private/.git.backup src/private/.git
    echo "Restored submodule reference"
fi

echo "Done!"
