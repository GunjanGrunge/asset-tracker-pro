import os
import json
import base64
import boto3
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import fitz  # PyMuPDF for PDF processing
from PIL import Image
import io
import logging

# Load environment variables and disable AWS config files
load_dotenv()
os.environ['AWS_CONFIG_FILE'] = '/dev/null'
os.environ['AWS_SHARED_CREDENTIALS_FILE'] = '/dev/null'

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SimpleBedrockReceiptParser:
    def __init__(self):
        """Initialize the simple Bedrock Receipt Parser without LlamaIndex"""
        
        # AWS Configuration
        self.aws_access_key = os.getenv('AWS_ACCESS_KEY_ID')
        self.aws_secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        self.aws_region = os.getenv('AWS_BEDROCK_REGION', 'us-east-1')
        self.model_id = os.getenv('AWS_BEDROCK_MODEL_ID', 'amazon.nova-lite-v1:0')
        
        # Initialize AWS session
        self.session = boto3.Session(
            aws_access_key_id=self.aws_access_key,
            aws_secret_access_key=self.aws_secret_key,
            region_name=self.aws_region
        )
        
        # Initialize Bedrock client
        self.bedrock_client = self.session.client('bedrock-runtime')
        logger.info(f"✅ Bedrock client initialized with region: {self.aws_region}")

    def extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        """Extract text from PDF using PyMuPDF"""
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            logger.info(f"📝 Extracted {len(text)} characters from PDF")
            return text
        except Exception as e:
            logger.error(f"❌ Error extracting text from PDF: {e}")
            return ""

    def extract_text_from_image(self, image_bytes: bytes, mime_type: str) -> str:
        """Extract text from image using Bedrock vision"""
        try:
            # Convert image to base64
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            
            # Prepare the request for Nova Lite vision
            prompt = """Analyze this receipt/invoice image and extract all visible text and information. 
            Focus on:
            - Product/item names
            - Prices and amounts
            - Dates
            - Store/vendor information
            - Model numbers or serial numbers
            - Warranty information
            
            Provide all extracted text clearly formatted."""
            
            request_body = {
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "text": prompt
                            },
                            {
                                "image": {
                                    "format": mime_type.split('/')[-1] if '/' in mime_type else "png",
                                    "source": {
                                        "bytes": image_base64
                                    }
                                }
                            }
                        ]
                    }
                ],
                "inferenceConfig": {
                    "maxTokens": 4000,
                    "temperature": 0.1
                }
            }
            
            # Invoke Bedrock model
            response = self.bedrock_client.invoke_model(
                modelId=self.model_id,
                contentType='application/json',
                accept='application/json',
                body=json.dumps(request_body)
            )
            
            # Parse response
            response_body = json.loads(response['body'].read())
            
            # Extract text based on model type
            if 'output' in response_body and 'message' in response_body['output']:
                # Nova Lite response format
                extracted_text = response_body['output']['message']['content'][0]['text']
            else:
                extracted_text = "Could not extract text from image"
            
            logger.info(f"📝 Extracted text from image using Bedrock vision")
            return extracted_text
            
        except Exception as e:
            logger.error(f"❌ Error processing image with Bedrock: {e}")
            return ""

    def parse_receipt_text(self, extracted_text: str) -> Dict[str, Any]:
        """Parse extracted text using Bedrock to structure the data"""
        try:
            prompt = f"""You are an expert at analyzing receipts and invoices to extract product information. Analyze this text and extract the following information in JSON format:

REQUIRED FIELDS:
- item_name: The main product/item name (exactly as written)
- price: The total amount paid (just the number, no currency symbols)
- date: The purchase/invoice date (convert to DD.MM.YYYY format)
- vendor: The store/company/brand name
- model_number: Product model, SKU, or part number (null if not found)
- description: Brief product description
- category: Product category (see categories below)

CATEGORY DETECTION RULES:
Analyze the item name, vendor, and product details to determine the most appropriate category:

"Electronics" - for: phones, computers, tablets, headphones, earbuds, speakers, cameras, gaming devices, smart watches, chargers, cables, TV, monitors, keyboards, mice, electronic accessories
Examples: iPhone, AirPods, MacBook, Samsung Galaxy, PlayStation, Xbox, Apple Watch, wireless charger

"Home Appliances" - for: kitchen appliances, washing machines, refrigerators, microwaves, air conditioners, vacuum cleaners, small home devices
Examples: coffee maker, blender, dishwasher, iron, hair dryer, toaster

"Vehicles" - for: cars, motorcycles, bicycles, car parts, automotive accessories
Examples: Toyota Camry, Honda bike, car tires, brake pads

"Furniture" - for: chairs, tables, beds, sofas, storage furniture, office furniture
Examples: dining table, office chair, bookshelf, mattress

"Tools & Equipment" - for: power tools, hand tools, machinery, construction equipment, workshop items
Examples: drill, hammer, saw, toolbox, generator

"Jewelry" - for: rings, necklaces, watches (non-smart), precious metals, gems
Examples: gold ring, diamond necklace, luxury watch

"Art & Collectibles" - for: paintings, sculptures, collectible items, antiques, art supplies
Examples: artwork, vintage items, collectible cards

"Sports & Recreation" - for: sports equipment, gym gear, outdoor gear, games, recreational items
Examples: tennis racket, dumbbells, camping gear, board games

"Other" - for items that don't fit the above categories

IMPORTANT: 
- Look at product names like "AirPods", "iPhone", "MacBook" → clearly "Electronics"
- Look at vendor names like "Apple", "Samsung", "Sony" → likely "Electronics" 
- Be intelligent about categorization based on product context
- Always choose the most specific and appropriate category

Text to analyze:
{extracted_text[:3000]}

Return ONLY valid JSON format with all required fields. No explanations or extra text."""
            
            request_body = {
                "messages": [
                    {
                        "role": "user",
                        "content": [{"text": prompt}]
                    }
                ],
                "inferenceConfig": {
                    "maxTokens": 1000,
                    "temperature": 0.1
                }
            }
            
            # Invoke Bedrock model
            response = self.bedrock_client.invoke_model(
                modelId=self.model_id,
                contentType='application/json',
                accept='application/json',
                body=json.dumps(request_body)
            )
            
            # Parse response
            response_body = json.loads(response['body'].read())
            
            if 'output' in response_body and 'message' in response_body['output']:
                # Nova Lite response format
                ai_response = response_body['output']['message']['content'][0]['text']
            else:
                logger.error("❌ Unexpected Bedrock response format")
                return self._create_fallback_response()
            
            # Try to parse JSON from the response
            try:
                # Clean up the response (remove code blocks if present)
                clean_response = ai_response.strip()
                if clean_response.startswith('```json'):
                    clean_response = clean_response[7:]
                if clean_response.endswith('```'):
                    clean_response = clean_response[:-3]
                clean_response = clean_response.strip()
                
                parsed_data = json.loads(clean_response)
                logger.info("✅ Successfully parsed structured data from receipt")
                return parsed_data
                
            except json.JSONDecodeError as e:
                logger.error(f"❌ Failed to parse JSON from AI response: {e}")
                logger.error(f"AI Response: {ai_response}")
                return self._create_fallback_response()
                
        except Exception as e:
            logger.error(f"❌ Error parsing receipt text: {e}")
            return self._create_fallback_response()

    def _create_fallback_response(self) -> Dict[str, Any]:
        """Create a fallback response when parsing fails"""
        return {
            "item_name": "Unable to extract",
            "price": 0,
            "date": "",
            "vendor": "Unable to extract",
            "warranty_period": None,
            "model_number": None,
            "description": "Manual entry required",
            "category": "Other"
        }

    async def parse_receipt(self, file_content: bytes, filename: str, content_type: str) -> Dict[str, Any]:
        """Main method to parse receipt from file content"""
        try:
            logger.info(f"📄 Processing file: {filename}, Type: {content_type}")
            
            extracted_text = ""
            
            # Handle PDF files
            if content_type == 'application/pdf' or filename.lower().endswith('.pdf'):
                extracted_text = self.extract_text_from_pdf(file_content)
                
            # Handle image files
            elif content_type.startswith('image/') or filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
                extracted_text = self.extract_text_from_image(file_content, content_type)
                
            else:
                logger.error(f"❌ Unsupported file type: {content_type}")
                return {
                    "success": False,
                    "error": f"Unsupported file type: {content_type}",
                    "data": self._create_fallback_response()
                }
            
            if not extracted_text:
                logger.error("❌ No text could be extracted from the file")
                return {
                    "success": False,
                    "error": "No text could be extracted from the file",
                    "data": self._create_fallback_response()
                }
            
            # Parse the extracted text
            structured_data = self.parse_receipt_text(extracted_text)
            
            return {
                "success": True,
                "extracted_text": extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text,
                "data": structured_data
            }
            
        except Exception as e:
            logger.error(f"❌ Error in parse_receipt: {e}")
            return {
                "success": False,
                "error": str(e),
                "data": self._create_fallback_response()
            }
