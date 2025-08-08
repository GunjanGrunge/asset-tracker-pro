#!/usr/bin/env python3
"""
Simplified Asset Tracker AI Service
- Extract data from receipts/invoices/warranty cards using LlamaIndex + AWS Bedrock
- Return extracted data to UI for form filling (no S3 upload or database operations)
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict, Any
import os
import logging
from datetime import datetime
from dotenv import load_dotenv
import uvicorn

from simple_receipt_parser import SimpleBedrockReceiptParser

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Asset Tracker AI Service",
    description="AI-powered document parsing and S3 upload service",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
receipt_parser = None

def get_receipt_parser():
    """Initialize receipt parser"""
    global receipt_parser
    if receipt_parser is None:
        try:
            receipt_parser = SimpleBedrockReceiptParser()
            logger.info("✅ Receipt parser initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize receipt parser: {e}")
            raise HTTPException(status_code=500, detail=f"Receipt parser initialization failed: {e}")
    return receipt_parser

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    try:
        # Test receipt parser initialization
        get_receipt_parser()
        
        logger.info("🚀 Asset Tracker AI Service started successfully")
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Asset Tracker AI Service",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "services": {
            "receipt_parser": "initialized" if receipt_parser else "not_initialized"
        }
    }

@app.get("/api/ai/test")
async def test_ai_services():
    """Test endpoint to verify AI services are working"""
    try:
        # Test receipt parser
        parser = get_receipt_parser()
        
        return {
            "success": True,
            "services": {
                "receipt_parser": "✅ Working"
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Service test failed: {e}")
        raise HTTPException(status_code=500, detail=f"Service test failed: {str(e)}")

@app.post("/api/ai/parse-receipt")
async def parse_receipt(file: UploadFile = File(...)):
    """
    Parse receipt/invoice/warranty card and extract asset information
    Returns extracted data for UI form filling
    """
    try:
        logger.info(f"📄 Processing file: {file.filename} ({file.content_type})")
        
        # Validate file type
        allowed_types = [
            'application/pdf',
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp',
            'image/tiff', 'image/webp'
        ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type: {file.content_type}. Supported types: {allowed_types}"
            )
        
        # Read file content
        file_content = await file.read()
        
        if len(file_content) == 0:
            raise HTTPException(status_code=400, detail="Empty file")
        
        # Parse document with receipt parser
        parser = get_receipt_parser()
        
        # Parse the receipt using the correct method
        extracted_data = await parser.parse_receipt(file_content, file.filename, file.content_type)
        
        # Prepare response for UI form filling
        response = {
            "success": True,
            "document_type": extracted_data.get("document_type", "receipt"),
            "extracted_data": extracted_data,
            "file_info": {
                "filename": file.filename,
                "content_type": file.content_type,
                "file_size": len(file_content)
            },
            "processed_at": datetime.utcnow().isoformat(),
            "message": "Data extracted successfully. Ready for UI form filling."
        }
        
        logger.info(f"✅ Successfully processed document: {file.filename}")
        return JSONResponse(content=response)
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error processing document {file.filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Document processing failed: {str(e)}")

if __name__ == "__main__":
    logger.info("🚀 Starting AI Receipt Parser service...")
    logger.info("🤖 Service: AI Text Extraction Only")
    logger.info("🌍 CORS: Enabled for React frontend")
    
    uvicorn.run(
        "simple_main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )
