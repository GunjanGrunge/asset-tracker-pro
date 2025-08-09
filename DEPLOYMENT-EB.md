# AWS Elastic Beanstalk Deployment Guide

This guide will help you deploy the Asset Tracker Pro application to AWS Elastic Beanstalk using Docker.

## Prerequisites

### 1. Install Required Tools

**AWS CLI:**
```bash
# Windows (using installer)
Download from: https://awscli.amazonaws.com/AWSCLIV2.msi

# Or using pip
pip install awscli
```

**EB CLI:**
```bash
pip install awsebcli
```

**Docker (for local testing):**
- Download from: https://www.docker.com/products/docker-desktop

### 2. Configure AWS Credentials

```bash
aws configure
```

Enter your:
- AWS Access Key ID
- AWS Secret Access Key  
- Default region: `ap-south-1`
- Default output format: `json`

## Deployment Steps

### Option 1: Using PowerShell Script (Windows)

```powershell
# Make the script executable and run
.\deploy-eb.ps1
```

### Option 2: Manual Deployment

1. **Build the frontend:**
   ```bash
   npm run build
   ```

2. **Initialize Elastic Beanstalk (first time only):**
   ```bash
   eb init --platform docker --region ap-south-1 asset-tracker-pro
   ```

3. **Create environment (first time only):**
   ```bash
   eb create asset-tracker-prod --instance-type t3.small --single-instance
   ```

4. **Deploy:**
   ```bash
   eb deploy
   ```

### Option 3: Using Docker Locally First

Test the Docker container locally before deploying:

```bash
# Build the Docker image
docker build -t asset-tracker-pro .

# Run locally
docker-compose up

# Test at http://localhost:8080
```

## Environment Variables Setup

After deployment, set the environment variables in AWS Elastic Beanstalk:

1. Go to AWS Console → Elastic Beanstalk
2. Select your application → Configuration → Software
3. Add the following environment variables:

### Required Variables:
```
NODE_ENV=production
PORT=8080

# Firebase
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# AWS
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
S3_BUCKET_NAME=your_bucket_name
S3_REGION=ap-south-1
AWS_BEDROCK_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=amazon.nova-lite-v1:0

# Database
DB_HOST=your_rds_endpoint
DB_PORT=5432
DB_NAME=your_db_name
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
DB_SSL=true
```

## Post-Deployment

### 1. Check Application Health
```bash
eb health
eb status
```

### 2. View Logs
```bash
eb logs
```

### 3. SSH into Instance (if needed)
```bash
eb ssh
```

### 4. Monitor Application
- CloudWatch Logs: Check `/aws/elasticbeanstalk/asset-tracker-prod/var/log/eb-docker/containers/eb-current-app/`
- Application logs: Available through `eb logs`

## Scaling & Configuration

### Instance Types:
- **Development**: t3.micro (free tier eligible)
- **Production**: t3.small or higher
- **High traffic**: t3.medium with load balancing

### Environment Types:
- **Single Instance**: Lower cost, good for development/small production
- **Load Balanced**: Auto-scaling, high availability

## Troubleshooting

### Common Issues:

1. **Build Failures:**
   - Check if all dependencies are in package.json
   - Verify Dockerfile syntax
   - Check build logs: `eb logs`

2. **Environment Variable Issues:**
   - Verify all required variables are set
   - Check for typos in variable names
   - Ensure sensitive values are properly configured

3. **Database Connection:**
   - Verify RDS security groups allow EB access
   - Check database credentials
   - Ensure SSL is configured correctly

4. **S3 Access:**
   - Verify IAM roles have S3 permissions
   - Check bucket policies
   - Ensure correct region configuration

### Useful Commands:
```bash
# Check application health
eb health

# View recent logs
eb logs

# SSH into instance
eb ssh

# Restart application
eb deploy --staged

# Terminate environment
eb terminate
```

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to version control
2. **IAM Roles**: Use least privilege principle
3. **Security Groups**: Restrict access to necessary ports only
4. **SSL**: Enable HTTPS for production
5. **Database**: Use RDS with encryption at rest

## Cost Optimization

1. **Instance Types**: Choose appropriate size for your traffic
2. **Monitoring**: Set up CloudWatch alarms for cost control
3. **Scheduled Scaling**: Scale down during low-traffic periods
4. **Reserved Instances**: For predictable workloads

## Support

For issues with deployment, check:
1. AWS Elastic Beanstalk documentation
2. Application logs via `eb logs`
3. CloudWatch metrics
4. This project's GitHub issues
