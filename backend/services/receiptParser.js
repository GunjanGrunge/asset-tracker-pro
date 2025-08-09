import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

class ReceiptParserService {
    constructor() {
        // Try different credential configurations
        const credentials = {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        };
        
        // Add session token if available (for temporary credentials)
        if (process.env.AWS_BEARER_TOKEN_BEDROCK) {
            credentials.sessionToken = process.env.AWS_BEARER_TOKEN_BEDROCK;
        }

        this.client = new BedrockRuntimeClient({
            region: process.env.AWS_BEDROCK_REGION || 'us-east-1',
            credentials: credentials
        });
        
        this.modelId = process.env.AWS_BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0';
        
        // Fallback models in order of preference
        this.fallbackModels = [
            'anthropic.claude-3-5-sonnet-20240620-v1:0',
            'amazon.nova-lite-v1:0',
            'amazon.nova-micro-v1:0'
        ];
        
        console.log(`🤖 Initializing Bedrock client with region: ${process.env.AWS_BEDROCK_REGION || 'us-east-1'}`);
        console.log(`🤖 Primary model: ${this.modelId}`);
        console.log(`🤖 Credentials configured: ${!!process.env.AWS_ACCESS_KEY_ID}`);
    }

    /**
     * Extract asset information from receipt/invoice using AWS Bedrock Nova Lite
     * @param {Buffer} imageBuffer - The image/PDF buffer
     * @param {string} mimeType - MIME type of the document
     * @returns {Object} Extracted asset information
     */
    async parseReceipt(imageBuffer, mimeType) {
        // Check if we should use mock responses for development
        if (process.env.MOCK_AI_RESPONSES === 'true') {
            console.log('Using mock AI response for development...');
            return this.getMockResponse();
        }

        try {
            console.log('Starting receipt parsing with Bedrock...');
            
            // Try the primary model first, then fallbacks
            let lastError;
            for (const modelId of [this.modelId, ...this.fallbackModels]) {
                try {
                    console.log(`Trying model: ${modelId}`);
                    const result = await this.parseWithModel(imageBuffer, mimeType, modelId);
                    console.log(`Successfully parsed with model: ${modelId}`);
                    return result;
                } catch (error) {
                    console.log(`Model ${modelId} failed:`, error.message);
                    lastError = error;
                    
                    // If it's an access error, try the next model
                    if (error.message.includes('access') || error.message.includes('model')) {
                        continue;
                    }
                    
                    // For other errors, don't continue trying
                    break;
                }
            }
            
            // If all models failed, throw the last error
            throw lastError;

        } catch (error) {
            console.error('Error parsing receipt with Bedrock:', error);
            throw new Error(`Receipt parsing failed: ${error.message}`);
        }
    }

    /**
     * Parse receipt with a specific model
     * @param {Buffer} imageBuffer - The image/PDF buffer
     * @param {string} mimeType - MIME type of the document
     * @param {string} modelId - The model ID to use
     * @returns {Object} Extracted asset information
     */
    async parseWithModel(imageBuffer, mimeType, modelId) {
        try {
            console.log(`🔍 Processing with model: ${modelId}`);
            
            // Convert buffer to base64
            const base64Image = imageBuffer.toString('base64');
            
            // Prepare the prompt for asset information extraction
            const prompt = `You are an AI assistant specialized in extracting asset information from receipts, invoices, and warranty cards. 

Please analyze this document and extract the following information in JSON format:
{
    "assetName": "Name of the product/item",
    "description": "Brief description of the item",
    "category": "Electronics/Furniture/Vehicle/Appliance/Other",
    "brand": "Brand name if available",
    "model": "Model number if available",
    "serialNumber": "Serial number if available",
    "purchaseAmount": "Purchase price as number (without currency symbols)",
    "currency": "Currency code (INR, USD, etc.)",
    "purchaseDate": "Purchase date in YYYY-MM-DD format",
    "warrantyPeriod": "Warranty period in months as number",
    "warrantyExpiry": "Warranty expiry date in YYYY-MM-DD format",
    "vendor": "Store/vendor name",
    "vendorContact": "Vendor contact information if available",
    "extractedText": "All text found in the document",
    "confidence": "Confidence level (high/medium/low)"
}

Instructions:
- Extract only the information that is clearly visible in the document
- Use null for fields that are not available or unclear
- For dates, use YYYY-MM-DD format
- For amounts, extract only numbers without currency symbols
- Be conservative with extraction - if unsure, mark as null
- Provide a confidence level based on document clarity

Analyze the document and provide the JSON response:`;

            // Prepare the request payload based on model type
            let requestBody;
            
            if (modelId.includes('claude')) {
                // Claude format (Anthropic models)
                requestBody = {
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: prompt
                                },
                                {
                                    type: "image",
                                    source: {
                                        type: "base64",
                                        media_type: mimeType.startsWith('image/') ? mimeType : 'image/png',
                                        data: base64Image
                                    }
                                }
                            ]
                        }
                    ],
                    max_tokens: 4000,
                    temperature: 0.1,
                    anthropic_version: "bedrock-2023-05-31"
                };
            } else if (modelId.includes('nova')) {
                // Nova format (Amazon models) - corrected format
                requestBody = {
                    messages: [
                        {
                            role: "user",
                            content: [
                                {
                                    text: prompt
                                },
                                {
                                    image: {
                                        format: mimeType.startsWith('image/') ? mimeType.split('/')[1] : 'png',
                                        source: {
                                            bytes: base64Image
                                        }
                                    }
                                }
                            ]
                        }
                    ],
                    inferenceConfig: {
                        maxTokens: 4000,
                        temperature: 0.1
                    }
                };
            } else {
                throw new Error(`Unsupported model format: ${modelId}`);
            }

            // Create the invoke command
            const command = new InvokeModelCommand({
                modelId: modelId,
                contentType: 'application/json',
                accept: 'application/json',
                body: JSON.stringify(requestBody)
            });

            console.log(`📤 Sending request to Bedrock model: ${modelId}...`);
            
            // Invoke the model with timeout
            const response = await Promise.race([
                this.client.send(command),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), 30000)
                )
            ]);
            
            console.log(`📥 Received response from Bedrock model: ${modelId}`);
            
            // Parse the response
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));
            console.log('📋 Response structure:', JSON.stringify(responseBody, null, 2));

            // Extract the content from the response
            let extractedText = '';
            
            // Handle different response formats
            if (responseBody.content && responseBody.content[0] && responseBody.content[0].text) {
                // Anthropic Claude format
                extractedText = responseBody.content[0].text;
            } else if (responseBody.output && responseBody.output.message && responseBody.output.message.content) {
                // Nova Lite format
                extractedText = responseBody.output.message.content[0].text;
            } else if (responseBody.completion) {
                // Alternative format
                extractedText = responseBody.completion;
            } else if (responseBody.generated_text) {
                // Another alternative format
                extractedText = responseBody.generated_text;
            } else {
                console.error('Unexpected response format:', responseBody);
                throw new Error(`Unexpected response format from Bedrock model: ${modelId}`);
            }

            console.log('📝 Extracted text preview:', extractedText.substring(0, 200) + '...');

            // Try to parse JSON from the extracted text
            let extractedData;
            try {
                // Look for JSON in the response
                const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    extractedData = JSON.parse(jsonMatch[0]);
                    console.log('✅ Successfully parsed JSON from AI response');
                } else {
                    console.log('⚠️ No JSON found in response, creating basic structure');
                    extractedData = this.createBasicStructure(extractedText);
                }
            } catch (parseError) {
                console.error('❌ Error parsing JSON from Bedrock response:', parseError);
                extractedData = this.createBasicStructure(extractedText);
            }

            // Validate and clean the extracted data
            const cleanedData = this.validateAndCleanData(extractedData);
            
            console.log('🎉 Receipt parsing completed successfully with model:', modelId);
            return cleanedData;

        } catch (error) {
            console.error(`❌ Error with model ${modelId}:`, error.message);
            throw error;
        }
    }

    /**
     * Create basic structure when JSON parsing fails
     * @param {string} extractedText - Raw extracted text
     * @returns {Object} Basic data structure
     */
    createBasicStructure(extractedText) {
        return {
            extractedText: extractedText,
            confidence: 'low',
            assetName: null,
            description: null,
            category: null,
            brand: null,
            model: null,
            serialNumber: null,
            purchaseAmount: null,
            currency: 'INR',
            purchaseDate: null,
            warrantyPeriod: null,
            warrantyExpiry: null,
            vendor: null,
            vendorContact: null
        };
    }

    /**
     * Get mock response for development testing
     * @returns {Object} Mock extracted data
     */
    getMockResponse() {
        return {
            assetName: 'MacBook Pro 16"',
            description: 'Apple MacBook Pro 16-inch with M2 Pro chip',
            category: 'Electronics',
            brand: 'Apple',
            model: 'MacBook Pro 16"',
            serialNumber: 'C02ZN123LVDH',
            purchaseAmount: 2499,
            currency: 'INR',
            purchaseDate: '2024-08-08',
            warrantyPeriod: 12,
            warrantyExpiry: '2025-08-08',
            vendor: 'Apple Store',
            vendorContact: 'support@apple.com',
            extractedText: 'APPLE STORE\nMacBook Pro 16"\nPrice: ₹2,49,900\nDate: 08/08/2024\nWarranty: 1 Year',
            confidence: 'high'
        };
    }

    /**
     * Validate and clean extracted data
     * @param {Object} data - Raw extracted data
     * @returns {Object} Cleaned and validated data
     */
    validateAndCleanData(data) {
        const cleaned = {
            assetName: this.cleanString(data.assetName),
            description: this.cleanString(data.description),
            category: this.cleanString(data.category),
            brand: this.cleanString(data.brand),
            model: this.cleanString(data.model),
            serialNumber: this.cleanString(data.serialNumber),
            purchaseAmount: this.cleanNumber(data.purchaseAmount),
            currency: this.cleanString(data.currency) || 'INR',
            purchaseDate: this.cleanDate(data.purchaseDate),
            warrantyPeriod: this.cleanNumber(data.warrantyPeriod),
            warrantyExpiry: this.cleanDate(data.warrantyExpiry),
            vendor: this.cleanString(data.vendor),
            vendorContact: this.cleanString(data.vendorContact),
            extractedText: this.cleanString(data.extractedText) || '',
            confidence: data.confidence || 'low'
        };

        return cleaned;
    }

    /**
     * Clean string values
     * @param {string} value - String to clean
     * @returns {string|null} Cleaned string or null
     */
    cleanString(value) {
        if (!value || typeof value !== 'string') return null;
        const cleaned = value.trim();
        return cleaned.length > 0 ? cleaned : null;
    }

    /**
     * Clean number values
     * @param {any} value - Value to convert to number
     * @returns {number|null} Cleaned number or null
     */
    cleanNumber(value) {
        if (value === null || value === undefined) return null;
        const num = parseFloat(value);
        return !isNaN(num) ? num : null;
    }

    /**
     * Clean date values
     * @param {string} value - Date string to clean
     * @returns {string|null} Cleaned date in YYYY-MM-DD format or null
     */
    cleanDate(value) {
        if (!value || typeof value !== 'string') return null;
        
        try {
            const date = new Date(value);
            if (isNaN(date.getTime())) return null;
            
            // Return in YYYY-MM-DD format
            return date.toISOString().split('T')[0];
        } catch (error) {
            return null;
        }
    }
}

export default ReceiptParserService;
