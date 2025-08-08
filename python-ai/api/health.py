from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import os
import logging
from datetime import datetime
import sys
import json

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from simple_receipt_parser import SimpleBedrockReceiptParser
except ImportError as e:
    logging.error(f"Failed to import SimpleBedrockReceiptParser: {e}")
    SimpleBedrockReceiptParser = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def handler(request):
    """Health check endpoint for AI service"""
    try:
        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": json.dumps({
                "status": "healthy",
                "service": "Asset Tracker AI Health Check",
                "timestamp": datetime.utcnow().isoformat(),
                "version": "1.0.0",
                "parser_available": SimpleBedrockReceiptParser is not None,
                "message": "AI service is running on Vercel serverless"
            })
        }
    except Exception as e:
        logger.error(f"❌ Error in health check: {e}")
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
        }
