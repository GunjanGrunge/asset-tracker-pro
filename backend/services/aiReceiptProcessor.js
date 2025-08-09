import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

// Initialize AWS clients
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_BEDROCK_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const s3Client = new S3Client({
  region: process.env.S3_REGION || process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Process receipt using AWS Bedrock AI
 */
export async function processReceiptWithAI(filePath, fileName) {
  try {
    console.log('Processing receipt with AWS Bedrock AI:', fileName);

    // Read file content
    const fileBuffer = fs.readFileSync(filePath);
    const fileBase64 = fileBuffer.toString('base64');
    
    // Determine file type
    const fileExtension = path.extname(fileName).toLowerCase();
    let mimeType = 'application/octet-stream';
    
    if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
      mimeType = 'image/jpeg';
    } else if (fileExtension === '.png') {
      mimeType = 'image/png';
    } else if (fileExtension === '.pdf') {
      mimeType = 'application/pdf';
    }

    // Prepare the prompt for receipt analysis
    const prompt = `
Analyze this receipt image and extract the following information in JSON format:

{
  "vendor": "Store/Company name",
  "date": "YYYY-MM-DD format",
  "total": "Total amount as number",
  "currency": "Currency code (USD, EUR, etc.)",
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
`;

    // Prepare the request for AWS Bedrock
    const modelId = process.env.AWS_BEDROCK_MODEL_ID || 'amazon.nova-lite-v1:0';
    
    let requestBody;
    
    if (modelId.includes('nova')) {
      // Amazon Nova models format
      requestBody = {
        messages: [
          {
            role: 'user',
            content: [
              {
                text: prompt
              },
              {
                image: {
                  format: mimeType.split('/')[1] === 'jpeg' ? 'jpeg' : 'png',
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
    } else {
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
    const command = new InvokeModelCommand({
      modelId: modelId,
      body: JSON.stringify(requestBody),
      contentType: 'application/json',
      accept: 'application/json',
    });

    console.log('Sending request to Bedrock model:', modelId);
    const response = await bedrockClient.send(command);
    
    // Parse the response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    console.log('Bedrock response:', responseBody);

    let extractedText;
    if (modelId.includes('nova')) {
      extractedText = responseBody.output?.message?.content?.[0]?.text || '';
    } else {
      extractedText = responseBody.content?.[0]?.text || '';
    }

    // Try to parse the JSON response
    let receiptData;
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

    // Upload original file to S3 for storage
    const s3Key = `receipts/${Date.now()}-${fileName}`;
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: mimeType,
      }));
      receiptData.s3_url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${s3Key}`;
    } catch (s3Error) {
      console.error('Failed to upload to S3:', s3Error);
      receiptData.s3_url = null;
    }

    return {
      success: true,
      data: receiptData,
      processing_time: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error processing receipt with AI:', error);
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
}

/**
 * Test AWS Bedrock connectivity
 */
export async function testBedrockConnection() {
  try {
    const modelId = process.env.AWS_BEDROCK_MODEL_ID || 'amazon.nova-lite-v1:0';
    
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

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return {
      success: true,
      model: modelId,
      response: responseBody
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
