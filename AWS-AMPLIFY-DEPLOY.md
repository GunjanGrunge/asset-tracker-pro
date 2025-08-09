# AWS Amplify Deployment Guide

## Prerequisites
- AWS Account with access to Amplify
- GitHub repository with your code
- Environment variables ready

## Deployment Steps

### 1. **Connect to AWS Amplify**
1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Click **"New app"** > **"Host web app"**
3. Select **GitHub** as source
4. Authorize AWS to access your repository
5. Select `asset-tracker-pro` repository
6. Choose `main` branch

### 2. **Configure Build Settings**
- Amplify will detect the `amplify.yml` file automatically
- Review the build configuration
- The config handles both frontend (React/Vite) and backend (Node.js + Python)

### 3. **Advanced Settings**
- **App name**: `asset-tracker-pro`
- **Environment name**: `production`
- **Enable full-stack deployments**: Yes

### 4. **Review and Deploy**
- Review all settings
- Click **"Save and deploy"**

### 5. **Add Environment Variables**
In Amplify Console > App Settings > Environment Variables, add:

```
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=your_aws_region
AWS_BEDROCK_REGION=your_bedrock_region
AWS_BEDROCK_MODEL_ID=your_model_id
S3_BUCKET_NAME=your_s3_bucket
S3_REGION=your_s3_region
DB_HOST=your_rds_endpoint
DB_PORT=5432
DB_NAME=your_database_name
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
NODE_ENV=production
```

### 6. **Domain Configuration**
- Amplify provides a default domain: `https://main.xxxxx.amplifyapp.com`
- You can add a custom domain in **Domain management**

### 7. **Backend API Setup**
The backend API will be available at:
- Main endpoint: `https://your-app.amplifyapp.com/api`
- Routes:
  - `/api/auth/*` - Authentication
  - `/api/assets/*` - Asset management
  - `/api/receipts/*` - Receipt processing
  - `/api/reminders/*` - Reminder management
  - `/api/ai/*` - AI processing

### 8. **Monitoring**
- Monitor builds in Amplify Console
- Check logs for any issues
- Test all API endpoints after deployment

## Troubleshooting

### Build Failures
- Check build logs in Amplify Console
- Verify all environment variables are set
- Ensure dependencies are properly listed in package.json

### API Issues
- Verify backend environment variables
- Check AWS permissions for S3, RDS, Bedrock
- Test database connectivity

### Frontend Issues
- Verify Firebase configuration variables
- Check if build artifacts are in correct directory (`dist`)
- Ensure all API endpoints are accessible

## Post-Deployment Testing
1. Visit the deployed URL
2. Test login functionality
3. Add a test asset
4. Upload a receipt for processing
5. Verify reminders work
6. Check that all AI features function correctly
