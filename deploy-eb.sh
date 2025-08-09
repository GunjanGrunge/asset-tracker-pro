#!/bin/bash

# AWS Elastic Beanstalk Deployment Script
# This script builds and deploys the application to AWS Elastic Beanstalk

set -e

echo "🚀 Starting AWS Elastic Beanstalk deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    echo "Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
    echo -e "${RED}❌ EB CLI is not installed. Please install it first.${NC}"
    echo "Install: pip install awsebcli"
    exit 1
fi

# Build the frontend first
echo -e "${YELLOW}📦 Building frontend...${NC}"
npm run build

# Create deployment package
echo -e "${YELLOW}📦 Creating deployment package...${NC}"

# Create a temp directory for deployment
DEPLOY_DIR="asset-tracker-deploy-$(date +%s)"
mkdir -p $DEPLOY_DIR

# Copy necessary files
cp -r backend/ $DEPLOY_DIR/
cp -r python-ai/ $DEPLOY_DIR/
cp -r dist/ $DEPLOY_DIR/frontend/
cp -r api/ $DEPLOY_DIR/
cp -r .ebextensions/ $DEPLOY_DIR/
cp Dockerfile $DEPLOY_DIR/
cp Dockerrun.aws.json $DEPLOY_DIR/
cp package.json $DEPLOY_DIR/
cp package-lock.json $DEPLOY_DIR/

# Copy environment file (without sensitive data)
cp .env.example $DEPLOY_DIR/.env

echo -e "${GREEN}✅ Deployment package created in $DEPLOY_DIR${NC}"

# Initialize EB application if not exists
if [ ! -f .elasticbeanstalk/config.yml ]; then
    echo -e "${YELLOW}🔧 Initializing Elastic Beanstalk application...${NC}"
    eb init --platform docker --region ap-south-1 asset-tracker-pro
fi

# Deploy to EB
echo -e "${YELLOW}🚀 Deploying to Elastic Beanstalk...${NC}"
cd $DEPLOY_DIR
eb deploy

echo -e "${GREEN}✅ Deployment completed!${NC}"
echo -e "${GREEN}🌐 Check your application status with: eb status${NC}"
echo -e "${GREEN}📝 View logs with: eb logs${NC}"

# Cleanup
cd ..
rm -rf $DEPLOY_DIR

echo -e "${GREEN}🧹 Cleanup completed!${NC}"
