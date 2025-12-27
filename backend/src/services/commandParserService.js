import { VertexAI } from '@google-cloud/vertexai';

// ============================================================================
// Vertex AI Configuration
// ============================================================================

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_PROJECT_ID || 'kaseddie-ai',
  location: 'us-central1'
});

const model = vertexAI.preview.getGenerativeModel({
  model: 'gemini-1.5-flash-001'
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Retry AI generation with exponential backoff strategy
 * @param {string} prompt - The prompt to send to the AI model
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<Object>} AI response object
 */
async function generateWithRetry(prompt, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Command Parser] Generation attempt ${attempt}/${maxRetries}`);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response;
    } catch (error) {
      lastError = error;
      console.error(`[Command Parser] Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const waitTime = 1000 * attempt;
        console.log(`[Command Parser] Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw new Error(`AI generation failed after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Extract text from Vertex AI response
 * @param {Object} response - Vertex AI response object
 * @returns {string} Extracted text
 */
function extractText(response) {
  try {
    if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return response.candidates[0].content.parts[0].text;
    }
  } catch (error) {
    console.error('[Command Parser] Response parsing error:', error);
  }
  return '';
}

/**
 * Validate Ethereum address format
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid Ethereum address
 */
function isValidEthereumAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }
  // Check if it starts with 0x and has 40 hex characters after
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate and resolve recipient address
 * Validates Ethereum address format and optionally resolves ENS names
 * 
 * @param {string} recipient - Recipient identifier (address or ENS name)
 * @returns {Promise<Object>} Validation result with resolved address or error
 */
export async function validateAndResolveRecipient(recipient) {
  try {
    console.log(`[Address Validator] Validating recipient: "${recipient}"`);
    
    // Check if input is provided
    if (!recipient || typeof recipient !== 'string' || recipient.trim().length === 0) {
      return {
        valid: false,
        error: {
          code: 'INVALID_ADDRESS',
          message: 'Recipient address is required'
        }
      };
    }

    const trimmedRecipient = recipient.trim();

    // Check if it's a valid Ethereum address
    if (isValidEthereumAddress(trimmedRecipient)) {
      console.log(`[Address Validator] Valid Ethereum address: ${trimmedRecipient}`);
      return {
        valid: true,
        address: trimmedRecipient,
        type: 'address'
      };
    }

    // Check if it might be an ENS name (ends with .eth)
    if (trimmedRecipient.endsWith('.eth')) {
      console.log(`[Address Validator] ENS name detected: ${trimmedRecipient}`);
      // ENS resolution is optional and not implemented yet
      // For now, return an error indicating ENS is not supported
      return {
        valid: false,
        error: {
          code: 'ENS_NOT_SUPPORTED',
          message: 'ENS name resolution is not yet supported. Please provide a valid Ethereum address (0x...)'
        },
        ensName: trimmedRecipient
      };
    }

    // Invalid format
    console.log(`[Address Validator] Invalid address format: ${trimmedRecipient}`);
    return {
      valid: false,
      error: {
        code: 'INVALID_ADDRESS_FORMAT',
        message: 'Invalid Ethereum address format. Address must start with 0x followed by 40 hexadecimal characters.'
      }
    };

  } catch (error) {
    console.error('[Address Validator] Validation error:', error.message);
    return {
      valid: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Failed to validate recipient address',
        details: error.message
      }
    };
  }
}

// ============================================================================
// Command Parser Service
// ============================================================================

/**
 * Parse voice command using Vertex AI
 * Extracts action, amount, and recipient from natural language text
 * 
 * @param {string} text - Transcribed voice command text
 * @returns {Promise<ParsedCommand>} Structured command data
 * @throws {Error} If parsing fails or command is invalid
 */
export async function parseVoiceCommand(text) {
  try {
    console.log(`[Command Parser] Parsing command: "${text}"`);
    
    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Command text is required');
    }

    // Construct AI prompt for command parsing
    const prompt = `You are a voice command parser for a cryptocurrency transfer system.

Parse the following voice command and extract:
1. Action: Should be "transfer" for sending tokens
2. Amount: The numeric amount to transfer (extract from words or digits)
3. Recipient: The Ethereum wallet address (0x followed by 40 hex characters)

Voice Command: "${text}"

Respond ONLY with valid JSON in this exact format:
{
  "action": "transfer",
  "amount": <number>,
  "recipient": "<ethereum_address>",
  "confidence": <number 0-100>,
  "reasoning": "<brief explanation of what was extracted>"
}

Rules:
- If the command is about sending/transferring tokens, action should be "transfer"
- Extract numeric amounts from words (e.g., "fifty" -> 50, "one hundred" -> 100)
- Only extract recipient if it's a valid Ethereum address starting with 0x
- Confidence should be 0-100 based on how clear the command is
- If any required field (action, amount, or recipient) is missing or unclear, set confidence to 0 and explain in reasoning
- If the command is ambiguous, set confidence below 50 and explain what needs clarification

Examples:
"Send 50 MNEE to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" -> {"action":"transfer","amount":50,"recipient":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb","confidence":95,"reasoning":"Clear transfer command with amount and valid address"}
"Transfer one hundred tokens to 0xABC..." -> {"action":"transfer","amount":100,"recipient":"0xABC...","confidence":90,"reasoning":"Clear amount, partial address needs completion"}
"Send money to John" -> {"action":"transfer","amount":0,"recipient":"","confidence":0,"reasoning":"Missing amount and recipient address"}

Respond ONLY with JSON, no additional text.`;

    // Generate AI response
    const response = await generateWithRetry(prompt);
    const text_response = extractText(response);
    
    if (!text_response) {
      throw new Error('Failed to get response from AI');
    }

    // Parse JSON response
    let parsedData;
    try {
      // Clean markdown formatting if present
      let jsonText = text_response.trim();
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/) || jsonText.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
      
      // Extract JSON object
      const jsonObjectMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonText = jsonObjectMatch[0];
      }
      
      parsedData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[Command Parser] JSON parsing failed:', parseError.message);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate parsed data structure
    if (!parsedData || typeof parsedData !== 'object') {
      throw new Error('Invalid parsed data structure');
    }

    // Extract fields with defaults
    const action = parsedData.action || '';
    const amount = typeof parsedData.amount === 'number' ? parsedData.amount : 0;
    const recipient = parsedData.recipient || '';
    const confidence = typeof parsedData.confidence === 'number' ? parsedData.confidence : 0;
    const reasoning = parsedData.reasoning || 'No reasoning provided';

    // Check for missing required fields
    const missingFields = [];
    if (!action || action !== 'transfer') {
      missingFields.push('action (must be "transfer")');
    }
    if (amount <= 0) {
      missingFields.push('amount (must be positive number)');
    }
    if (!recipient || !isValidEthereumAddress(recipient)) {
      missingFields.push('recipient (must be valid Ethereum address)');
    }

    // If any required fields are missing, return error
    if (missingFields.length > 0) {
      return {
        error: {
          code: 'MISSING_PARAMETERS',
          message: `Unable to parse command. Missing or invalid: ${missingFields.join(', ')}`,
          details: reasoning
        },
        rawText: text,
        timestamp: new Date().toISOString()
      };
    }

    // Check for ambiguous commands (low confidence)
    if (confidence < 50) {
      return {
        error: {
          code: 'AMBIGUOUS_COMMAND',
          message: 'Command is unclear. Please provide more specific details.',
          details: reasoning,
          clarificationNeeded: true
        },
        rawText: text,
        timestamp: new Date().toISOString()
      };
    }

    // Return successfully parsed command
    const parsedCommand = {
      action,
      amount,
      recipient,
      confidence,
      rawText: text,
      timestamp: new Date().toISOString()
    };

    console.log(`[Command Parser] Successfully parsed command:`, parsedCommand);
    return parsedCommand;

  } catch (error) {
    console.error('[Command Parser] Error parsing command:', error.message);
    
    // Return structured error
    return {
      error: {
        code: 'PARSING_FAILED',
        message: 'Failed to parse voice command',
        details: error.message
      },
      rawText: text,
      timestamp: new Date().toISOString()
    };
  }
}
