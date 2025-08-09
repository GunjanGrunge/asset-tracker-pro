# Unified Vercel Deployment Guide

## Overview
Your application is now configured for unified deployment on Vercel with a single API function that handles:
- **Frontend**: React app served as static files
- **Backend**: Node.js/Express API routes  
- **Python AI**: Receipt processing via spawned Python processes

## What Changed

### ✅ Removed Elastic Beanstalk Files
- Deleted all `.ebextensions/`, `Dockerfile`, `Dockerrun.aws.json`, etc.
- Cleaned up deployment scripts and documentation

### ✅ Unified API Function (`api/index.js`)
- **Frontend Serving**: Serves built React app from `/dist`
- **Backend Routes**: All existing API routes (`/api/auth`, `/api/assets`, etc.)
- **Python Integration**: New routes for AI processing:
  - `POST /api/python/process-receipt` - Upload and process receipts
  - `GET /api/python/health` - Check Python service status
- **SPA Routing**: All non-API routes serve React app for client-side routing

### ✅ Simplified Vercel Configuration
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "dist" }
    },
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/index.js" },
    { "src": "/(.*)", "dest": "/dist/index.html" }
  ]
}
```

### ✅ Python Dependencies
- Created root `requirements.txt` for Vercel Python runtime
- Python scripts will run via Node.js `spawn()` calls

## Deployment Steps

1. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository: `GunjanGrunge/asset-tracker-pro`

2. **Configure Environment Variables** in Vercel dashboard:
   ```
   NODE_ENV=production
   DATABASE_URL=your_postgres_connection_string
   JWT_SECRET=your_jwt_secret
   AWS_ACCESS_KEY_ID=your_aws_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret
   AWS_REGION=your_aws_region
   FRONTEND_URL=https://your-app.vercel.app
   ```

3. **Deploy**: Vercel will automatically build and deploy

## API Endpoints

### Frontend
- `/` - Main React app
- `/assets` - Asset management page
- `/reminders` - Reminders page
- All other routes serve React app for SPA routing

### Backend APIs
- `GET /api/health` - Health check for all services
- `POST /api/auth/*` - Authentication routes
- `GET/POST /api/assets/*` - Asset management
- `GET/POST /api/reminders/*` - Reminder management
- `POST /api/receipts/*` - Receipt upload and management

### Python AI APIs
- `POST /api/python/process-receipt` - Upload file for AI processing
- `GET /api/python/health` - Python service health check

## Benefits

✅ **Single Deployment**: One unified function handles everything  
✅ **Simplified Architecture**: No need for multiple services  
✅ **Cost Effective**: Single Vercel function instead of multiple  
✅ **Easy Maintenance**: All code in one place  
✅ **Auto Scaling**: Vercel handles scaling automatically  

## Testing Locally

```bash
# Build frontend
npm run build

# Start development (for testing)
npm run dev

# Test API endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/python/health
```

Your application is now ready for Vercel deployment! 🚀
