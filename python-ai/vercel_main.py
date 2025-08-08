# AssetTracker Pro Python AI Service
# Vercel-compatible deployment configuration

from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mangum import Mangum
import os
import logging
from datetime import datetime
from simple_receipt_parser import SimpleBedrockReceiptParser

# Configure logging for production
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app for serverless
app = FastAPI(
    title="Asset Tracker AI Service",
    description="AI-powered document parsing service for Vercel",
    version="1.0.0",
    docs_url="/python-ai/docs" if os.getenv("NODE_ENV") == "development" else None
)

# CORS middleware for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global receipt parser instance
receipt_parser = None

def get_receipt_parser():
    """Initialize receipt parser for serverless"""
    global receipt_parser
    if receipt_parser is None:
        try:
            receipt_parser = SimpleBedrockReceiptParser()
            logger.info("✅ Receipt parser initialized for serverless")
        except Exception as e:
            logger.error(f"❌ Failed to initialize receipt parser: {e}")
            raise HTTPException(status_code=500, detail=f"Parser init failed: {e}")
    return receipt_parser

@app.get("/python-ai/health")
async def health_check():
    """Health check for serverless deployment"""
    return {
        "status": "healthy",
        "service": "Asset Tracker AI (Serverless)",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@app.post("/python-ai/parse-receipt")
async def parse_receipt(file: UploadFile = File(...)):
    """Parse receipt for serverless deployment"""
    try:
        logger.info(f"📄 Processing file: {file.filename}")
        
        # Validate file type
        allowed_types = [
            'application/pdf',
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
            'image/tiff', 'image/webp'
        ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type: {file.content_type}"
            )
        
        # Read file content
        file_content = await file.read()
        if len(file_content) == 0:
            raise HTTPException(status_code=400, detail="Empty file")
        
        # Parse document
        parser = get_receipt_parser()
        extracted_data = await parser.parse_receipt(
            file_content, file.filename, file.content_type
        )
        
        response = {
            "success": True,
            "document_type": extracted_data.get("document_type", "receipt"),
            "extracted_data": extracted_data,
            "file_info": {
                "filename": file.filename,
                "content_type": file.content_type,
                "file_size": len(file_content)
            },
            "processed_at": datetime.utcnow().isoformat()
        }
        
        logger.info(f"✅ Successfully processed: {file.filename}")
        return JSONResponse(content=response)
                
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error processing {file.filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

# Serverless handler for Vercel
handler = Mangum(app)

# For local development
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
