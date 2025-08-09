import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// AWS Configuration
const AWS_CONFIG = {
  region: import.meta.env.VITE_AWS_BEDROCK_REGION || 'us-east-1',
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
  },
};

const S3_CONFIG = {
  region: import.meta.env.VITE_AWS_REGION || 'ap-south-1',
  credentials: AWS_CONFIG.credentials,
};

// Initialize clients
let bedrockClient: BedrockRuntimeClient | null = null;
let s3Client: S3Client | null = null;

const getBedrockClient = () => {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient(AWS_CONFIG);
  }
  return bedrockClient;
};

const getS3Client = () => {
  if (!s3Client) {
    s3Client = new S3Client(S3_CONFIG);
  }
  return s3Client;
};

export interface ReceiptData {
  vendor: string | null;
  date: string | null;
  total: number | null;
  currency: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    category: string;
  }>;
  category: string;
  tax: number | null;
  payment_method: string | null;
  s3_url?: string;
  raw_response?: string;
}

export interface ProcessingResult {
  success: boolean;
  data?: ReceiptData;
  error?: string;
  processing_time?: string;
}

/**
 * Convert file to base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix to get just the base64 string
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Upload file to S3 and return URL
 */
const uploadToS3 = async (file: File): Promise<string | null> => {
  try {
    const client = getS3Client();
    const key = `receipts/${Date.now()}-${file.name}`;
    
    const command = new PutObjectCommand({
      Bucket: import.meta.env.VITE_S3_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: file.type,
    });

    await client.send(command);
    
    const bucketName = import.meta.env.VITE_S3_BUCKET_NAME;
    const region = import.meta.env.VITE_S3_REGION || import.meta.env.VITE_AWS_REGION;
    return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('S3 upload failed:', error);
    return null;
  }
};

/**
 * Process receipt using AWS Bedrock
 */
export const processReceiptWithBedrock = async (
  file: File,
  onProgress?: (message: string) => void
): Promise<ProcessingResult> => {
  try {
    console.log('🤖 Starting receipt processing...');
    console.log('📄 File details:', { name: file.name, size: file.size, type: file.type });
    
    // Check if AWS credentials are available
    const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
    const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;
    
    console.log('🔑 AWS Credentials check:', {
      accessKeyId: accessKeyId ? `${accessKeyId.slice(0, 8)}...` : 'MISSING',
      secretAccessKey: secretAccessKey ? `${secretAccessKey.slice(0, 8)}...` : 'MISSING',
      region: import.meta.env.VITE_AWS_BEDROCK_REGION || 'us-east-1'
    });
    
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not found. Please add VITE_AWS_ACCESS_KEY_ID and VITE_AWS_SECRET_ACCESS_KEY to your .env file');
    }
    
    onProgress?.('🔍 Analyzing receipt...');

    // Convert file to base64
    const fileBase64 = await fileToBase64(file);
    
    // Determine file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    let mimeType = 'application/octet-stream';
    let format = 'png';
    
    if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
      mimeType = 'image/jpeg';
      format = 'jpeg';
    } else if (fileExtension === 'png') {
      mimeType = 'image/png';
      format = 'png';
    } else if (fileExtension === 'pdf') {
      mimeType = 'application/pdf';
      format = 'pdf';
    }

    onProgress?.('🤖 Processing with AI...');

    // Prepare the prompt for receipt analysis
    const prompt = `
Analyze this receipt image and extract the following information in JSON format:

{
  "vendor": "Store/Company name",
  "date": "YYYY-MM-DD format",
  "total": "Total amount as number",
  "currency": "Currency code (USD, EUR, INR, etc.)",
  "items": [
    {
      "name": "Item name",
      "quantity": "quantity as number",
      "price": "price as number",
      "category": "category (electronics, food, etc.)"
    }
  ],
  "category": "Main category of purchase",
  "tax": "Tax amount as number",
  "payment_method": "Payment method if visible"
}

Extract all readable information from the receipt. If any field is not clearly visible, use null for that field.
Return only the JSON object, no other text.
`;

    // Prepare the request for AWS Bedrock
    const modelId = import.meta.env.VITE_AWS_BEDROCK_MODEL_ID || 'amazon.nova-lite-v1:0';
    
    let requestBody;
    
    if (modelId.includes('nova')) {
      // Amazon Nova models format - Updated to correct schema for Nova Lite
      requestBody = {
        messages: [
          {
            role: 'user',
            content: [
              {
                text: prompt
              },
              {
                document: {
                  format: format,
                  name: 'receipt',
                  source: {
                    bytes: fileBase64
                  }
                }
              }
            ]
          }
        ],
        inferenceConfig: {
          maxTokens: 1000,
          temperature: 0.1
        }
      };
    } else if (modelId.includes('claude')) {
      // Anthropic Claude models format
      requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1000,
        temperature: 0.1,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: fileBase64
                }
              }
            ]
          }
        ]
      };
    }

    // Invoke the model
    const client = getBedrockClient();
    console.log('📋 Request body structure:', JSON.stringify(requestBody, null, 2));
    
    const command = new InvokeModelCommand({
      modelId: modelId,
      body: JSON.stringify(requestBody),
      contentType: 'application/json',
      accept: 'application/json',
    });

    console.log('🚀 Sending request to Bedrock model:', modelId);
    console.log('🔧 Command details:', { modelId, contentType: 'application/json' });
    
    const response = await client.send(command);
    console.log('✅ Bedrock response received');
    
    // Parse the response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log('📥 Response body:', responseBody);
      
      console.log('🤖 Bedrock response:', responseBody);

      let extractedText: string;
      if (modelId.includes('nova')) {
        extractedText = responseBody.output?.message?.content?.[0]?.text || '';
      } else {
        extractedText = responseBody.content?.[0]?.text || '';
      }

      onProgress?.('📝 Extracting data...');

      // Try to parse the JSON response
      let receiptData: ReceiptData;
      try {
        // Extract JSON from the response (in case there's extra text)
        const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          receiptData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        // Return a structured response even if parsing fails
        receiptData = {
          vendor: null,
          date: null,
          total: null,
          currency: 'USD',
          items: [],
          category: 'general',
          tax: null,
          payment_method: null,
          raw_response: extractedText
        };
      }

      onProgress?.('☁️ Uploading to cloud...');

      // Upload original file to S3 for storage
      const s3Url = await uploadToS3(file);
      if (s3Url) {
        receiptData.s3_url = s3Url;
      }

      onProgress?.('✅ Processing complete!');

      return {
        success: true,
        data: receiptData,
        processing_time: new Date().toISOString()
      };

    } catch (error: any) {
      console.error('Error processing receipt with Bedrock:', error);
      return {
        success: false,
        error: error.message || 'Failed to process receipt'
      };
    }
};

/**
 * Test AWS Bedrock connectivity
 */
export const testBedrockConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const client = getBedrockClient();
    const modelId = import.meta.env.VITE_AWS_BEDROCK_MODEL_ID || 'amazon.nova-lite-v1:0';
    
    const requestBody = {
      messages: [
        {
          role: 'user',
          content: [{ text: 'Hello, just testing the connection. Please respond with "Connection successful".' }]
        }
      ],
      inferenceConfig: {
        maxTokens: 50,
        temperature: 0.1
      }
    };

    const command = new InvokeModelCommand({
      modelId: modelId,
      body: JSON.stringify(requestBody),
      contentType: 'application/json',
      accept: 'application/json',
    });

    await client.send(command);
    
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
};
