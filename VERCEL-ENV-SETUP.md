# Vercel Environment Variables Guide

Based on your .env file, you need to set these environment variables in Vercel:

## Required Environment Variables for Vercel:

### Database (Choose ONE option):

**Option 1: Individual Variables (current setup)**
```
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=your_db_name
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DB_SSL=true
```

**Option 2: Single DATABASE_URL (recommended for Vercel)**
```
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
```

### AWS Configuration
```
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=ap-south-1
AWS_BEDROCK_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
S3_BUCKET_NAME=theassetdb
S3_REGION=ap-south-1
```

### Firebase Configuration
```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_sender_id
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
```

### App Configuration
```
NODE_ENV=production
BYPASS_AUTH=false
FRONTEND_URL=https://your-app-name.vercel.app
```

## Steps to Deploy:

1. **Set Environment Variables in Vercel Dashboard**
   - Go to your project settings in Vercel
   - Add all the environment variables above

2. **Deploy**
   - Push changes to GitHub
   - Vercel will automatically redeploy

3. **Test API Endpoints**
   - `/api/health` - Should show all services healthy
   - `/api/test/db` - Test database connection
   - `/api/test/python` - Test Python availability
