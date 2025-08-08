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

# Global parser instance
receipt_parser = None

def get_receipt_parser():
    """Initialize receipt parser for serverless"""
    global receipt_parser
    if receipt_parser is None and SimpleBedrockReceiptParser:
        try:
            receipt_parser = SimpleBedrockReceiptParser()
            logger.info("✅ Receipt parser initialized for Vercel")
        except Exception as e:
            logger.error(f"❌ Failed to initialize receipt parser: {e}")
            return None
    return receipt_parser

def handler(request):
    """Vercel serverless function handler for AI services"""
    try:
        # Parse the request path
        path = request.get('path', '/').lower()
        method = request.get('method', 'GET').upper()
        
        logger.info(f"🔍 AI Service Request: {method} {path}")
        
        # Health check endpoint
        if path.endswith('/health') or path.endswith('/'):
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
                    "service": "Asset Tracker AI (Vercel Serverless)",
                    "timestamp": datetime.utcnow().isoformat(),
                    "version": "1.0.0",
                    "parser_available": SimpleBedrockReceiptParser is not None
                })
            }
        
        # Handle OPTIONS for CORS
        if method == 'OPTIONS':
            return {
                "statusCode": 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                },
                "body": ""
            }
        
        # Parse receipt endpoint (simplified for Vercel)
        if path.endswith('/parse-receipt') and method == 'POST':
            if not SimpleBedrockReceiptParser:
                return {
                    "statusCode": 500,
                    "headers": {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*"
                    },
                    "body": json.dumps({
                        "success": False,
                        "error": "Receipt parser not available",
                        "message": "SimpleBedrockReceiptParser could not be imported"
                    })
                }
            
            # For now, return a mock response since file upload is complex in Vercel
            return {
                "statusCode": 200,
                "headers": {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                },
                "body": json.dumps({
                    "success": True,
                    "message": "AI service is available but file upload needs to be handled by main backend",
                    "timestamp": datetime.utcnow().isoformat(),
                    "recommended_approach": "Use Node.js backend to handle file uploads and call AWS Bedrock directly"
                })
            }
        
        # Default response
        return {
            "statusCode": 404,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "error": "Not Found",
                "available_endpoints": ["/health", "/parse-receipt"],
                "timestamp": datetime.utcnow().isoformat()
            })
        }
        
    except Exception as e:
        logger.error(f"❌ Error in AI service handler: {e}")
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
        }
