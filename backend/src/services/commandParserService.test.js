import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock the Vertex AI client before importing the service
vi.mock('@google-cloud/vertexai', () => {
  // Create mock function inside the factory
  const mockFn = vi.fn();
  
  return {
    VertexAI: class MockVertexAI {
      constructor() {
        this.preview = {
          getGenerativeModel: () => ({
            generateContent: mockFn
          })
        };
        // Store reference for access in tests
        this._mockGenerateContent = mockFn;
      }
    },
    // Export the mock function for test access
    _getMockGenerateContent: () => mockFn
  };
});

// Import after mocking
import { parseVoiceCommand, validateAndResolveRecipient } from './commandParserService.js';
import { VertexAI } from '@google-cloud/vertexai';

// Get the mock function
const vertexInstance = new VertexAI();
const mockGenerateContent = vertexInstance._mockGenerateContent;

describe('Command Parser Service Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 8: Action extraction from commands', () => {
    /**
     * Feature: voice-mnee-transfer, Property 8: Action extraction from commands
     * Validates: Requirements 4.1
     * 
     * For any command text containing transfer-related keywords (send, transfer, pay),
     * the AI Parser should extract "transfer" as the action type.
     */
    it('should extract "transfer" action from commands with transfer keywords', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate commands with transfer keywords
          fc.constantFrom('send', 'transfer', 'pay', 'Send', 'Transfer', 'Pay', 'SEND'),
          // Generate random amounts
          fc.integer({ min: 1, max: 10000 }),
          // Generate valid Ethereum addresses
          fc.hexaString({ minLength: 40, maxLength: 40 }),
          async (keyword, amount, addressHex) => {
            const recipient = `0x${addressHex}`;
            const command = `${keyword} ${amount} MNEE to ${recipient}`;

            // Mock AI response with transfer action
            mockGenerateContent.mockResolvedValueOnce({
              response: {
                candidates: [{
                  content: {
                    parts: [{
                      text: JSON.stringify({
                        action: 'transfer',
                        amount: amount,
                        recipient: recipient,
                        confidence: 95,
                        reasoning: `Extracted ${keyword} command`
                      })
                    }]
                  }
                }]
              }
            });

            const result = await parseVoiceCommand(command);

            // Property: Action should be "transfer" for transfer-related keywords
            expect(result.error).toBeUndefined();
            expect(result.action).toBe('transfer');
          }
        ),
        { numRuns: 100 }
      );
    }, 30000); // 30 second timeout

    it('should handle various phrasings of transfer commands', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'send {amount} to {recipient}',
            'transfer {amount} MNEE to {recipient}',
            'pay {recipient} {amount}',
            'please send {amount} tokens to {recipient}',
            'I want to transfer {amount} to {recipient}'
          ),
          fc.integer({ min: 1, max: 10000 }),
          fc.hexaString({ minLength: 40, maxLength: 40 }),
          async (template, amount, addressHex) => {
            const recipient = `0x${addressHex}`;
            const command = template
              .replace('{amount}', amount.toString())
              .replace('{recipient}', recipient);

            mockGenerateContent.mockResolvedValueOnce({
              response: {
                candidates: [{
                  content: {
                    parts: [{
                      text: JSON.stringify({
                        action: 'transfer',
                        amount: amount,
                        recipient: recipient,
                        confidence: 90,
                        reasoning: 'Transfer command detected'
                      })
                    }]
                  }
                }]
              }
            });

            const result = await parseVoiceCommand(command);

            // Property: All transfer phrasings should extract "transfer" action
            expect(result.error).toBeUndefined();
            expect(result.action).toBe('transfer');
          }
        ),
        { numRuns: 100 }
      );
    }, 30000); // 30 second timeout
  });

  describe('Property 9: Amount extraction from commands', () => {
    /**
     * Feature: voice-mnee-transfer, Property 9: Amount extraction from commands
     * Validates: Requirements 4.2
     * 
     * For any command text containing a numeric amount (in digits or words),
     * the AI Parser should extract the correct numeric value.
     */
    it('should extract correct numeric amounts from commands', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          fc.hexaString({ minLength: 40, maxLength: 40 }),
          async (amount, addressHex) => {
            const recipient = `0x${addressHex}`;
            const command = `send ${amount} MNEE to ${recipient}`;

            mockGenerateContent.mockResolvedValueOnce({
              response: {
                candidates: [{
                  content: {
                    parts: [{
                      text: JSON.stringify({
                        action: 'transfer',
                        amount: amount,
                        recipient: recipient,
                        confidence: 95,
                        reasoning: 'Amount extracted correctly'
                      })
                    }]
                  }
                }]
              }
            });

            const result = await parseVoiceCommand(command);

            // Property: Extracted amount should match the input amount
            expect(result.error).toBeUndefined();
            expect(result.amount).toBe(amount);
            expect(typeof result.amount).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should handle word-based amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            { word: 'fifty', value: 50 },
            { word: 'one hundred', value: 100 },
            { word: 'twenty', value: 20 },
            { word: 'five', value: 5 }
          ),
          fc.hexaString({ minLength: 40, maxLength: 40 }),
          async (amountObj, addressHex) => {
            const recipient = `0x${addressHex}`;
            const command = `send ${amountObj.word} MNEE to ${recipient}`;

            mockGenerateContent.mockResolvedValueOnce({
              response: {
                candidates: [{
                  content: {
                    parts: [{
                      text: JSON.stringify({
                        action: 'transfer',
                        amount: amountObj.value,
                        recipient: recipient,
                        confidence: 90,
                        reasoning: `Converted "${amountObj.word}" to ${amountObj.value}`
                      })
                    }]
                  }
                }]
              }
            });

            const result = await parseVoiceCommand(command);

            // Property: Word amounts should be converted to numeric values
            expect(result.error).toBeUndefined();
            expect(result.amount).toBe(amountObj.value);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Property 10: Recipient address resolution', () => {
    /**
     * Feature: voice-mnee-transfer, Property 10: Recipient address resolution
     * Validates: Requirements 4.3
     * 
     * For any command text containing a recipient identifier (Ethereum address, ENS name),
     * the AI Parser should resolve it to a valid Ethereum address format (0x...).
     */
    it('should extract and validate Ethereum addresses from commands', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          fc.hexaString({ minLength: 40, maxLength: 40 }),
          async (amount, addressHex) => {
            const recipient = `0x${addressHex}`;
            const command = `send ${amount} to ${recipient}`;

            mockGenerateContent.mockResolvedValueOnce({
              response: {
                candidates: [{
                  content: {
                    parts: [{
                      text: JSON.stringify({
                        action: 'transfer',
                        amount: amount,
                        recipient: recipient,
                        confidence: 95,
                        reasoning: 'Valid Ethereum address extracted'
                      })
                    }]
                  }
                }]
              }
            });

            const result = await parseVoiceCommand(command);

            // Property: Recipient should be a valid Ethereum address format (0x + 40 hex chars)
            expect(result.error).toBeUndefined();
            expect(result.recipient).toMatch(/^0x[a-fA-F0-9]{40}$/);
            expect(result.recipient).toBe(recipient);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should reject commands with invalid Ethereum address formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          fc.constantFrom(
            '0x123',                                    // Too short
            '0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG', // Invalid hex chars
            'not-an-address',                           // Not an address
            '742d35Cc6634C0532925a3b844Bc9e7595f0bEb',  // Missing 0x prefix
            ''                                          // Empty string
          ),
          async (amount, invalidAddress) => {
            const command = `send ${amount} to ${invalidAddress}`;

            mockGenerateContent.mockResolvedValueOnce({
              response: {
                candidates: [{
                  content: {
                    parts: [{
                      text: JSON.stringify({
                        action: 'transfer',
                        amount: amount,
                        recipient: invalidAddress,
                        confidence: 30,
                        reasoning: 'Invalid recipient address format'
                      })
                    }]
                  }
                }]
              }
            });

            const result = await parseVoiceCommand(command);

            // Property: Invalid addresses should result in error
            expect(result.error).toBeDefined();
            expect(result.error.code).toMatch(/MISSING_PARAMETERS|AMBIGUOUS_COMMAND/);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should handle ENS names appropriately', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          fc.constantFrom('alice.eth', 'bob.eth', 'charlie.eth', 'vitalik.eth'),
          async (amount, ensName) => {
            const command = `send ${amount} to ${ensName}`;

            // AI might extract ENS name but validation will catch it
            mockGenerateContent.mockResolvedValueOnce({
              response: {
                candidates: [{
                  content: {
                    parts: [{
                      text: JSON.stringify({
                        action: 'transfer',
                        amount: amount,
                        recipient: ensName,
                        confidence: 85,
                        reasoning: 'ENS name detected'
                      })
                    }]
                  }
                }]
              }
            });

            const result = await parseVoiceCommand(command);

            // Property: ENS names should either be resolved to addresses or return error
            // Currently ENS is not supported, so should return error
            expect(result.error).toBeDefined();
            expect(result.error.code).toMatch(/MISSING_PARAMETERS/);
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);

    it('should preserve address case sensitivity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          fc.hexaString({ minLength: 40, maxLength: 40 }),
          fc.constantFrom('lower', 'upper', 'mixed'),
          async (amount, addressHex, caseType) => {
            let recipient;
            if (caseType === 'lower') {
              recipient = `0x${addressHex.toLowerCase()}`;
            } else if (caseType === 'upper') {
              recipient = `0x${addressHex.toUpperCase()}`;
            } else {
              // Mixed case
              recipient = `0x${addressHex}`;
            }
            
            const command = `send ${amount} to ${recipient}`;

            mockGenerateContent.mockResolvedValueOnce({
              response: {
                candidates: [{
                  content: {
                    parts: [{
                      text: JSON.stringify({
                        action: 'transfer',
                        amount: amount,
                        recipient: recipient,
                        confidence: 95,
                        reasoning: 'Valid address extracted'
                      })
                    }]
                  }
                }]
              }
            });

            const result = await parseVoiceCommand(command);

            // Property: Address should be valid regardless of case
            expect(result.error).toBeUndefined();
            expect(result.recipient).toMatch(/^0x[a-fA-F0-9]{40}$/);
            expect(result.recipient.toLowerCase()).toBe(recipient.toLowerCase());
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Property 11: Parser output structure', () => {
    /**
     * Feature: voice-mnee-transfer, Property 11: Parser output structure
     * Validates: Requirements 4.4
     * 
     * For any successfully parsed command, the output should contain all required fields:
     * action (string), amount (number), recipient (string), and confidence (number 0-100).
     */
    it('should return complete structure for valid commands', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          fc.hexaString({ minLength: 40, maxLength: 40 }),
          fc.integer({ min: 50, max: 100 }),
          async (amount, addressHex, confidence) => {
            const recipient = `0x${addressHex}`;
            const command = `send ${amount} to ${recipient}`;

            mockGenerateContent.mockResolvedValueOnce({
              response: {
                candidates: [{
                  content: {
                    parts: [{
                      text: JSON.stringify({
                        action: 'transfer',
                        amount: amount,
                        recipient: recipient,
                        confidence: confidence,
                        reasoning: 'Complete command parsed'
                      })
                    }]
                  }
                }]
              }
            });

            const result = await parseVoiceCommand(command);

            // Property: Output must have all required fields with correct types
            expect(result.error).toBeUndefined();
            expect(result).toHaveProperty('action');
            expect(typeof result.action).toBe('string');
            expect(result.action).toBe('transfer');
            
            expect(result).toHaveProperty('amount');
            expect(typeof result.amount).toBe('number');
            expect(result.amount).toBeGreaterThan(0);
            
            expect(result).toHaveProperty('recipient');
            expect(typeof result.recipient).toBe('string');
            expect(result.recipient).toMatch(/^0x[a-fA-F0-9]{40}$/);
            
            expect(result).toHaveProperty('confidence');
            expect(typeof result.confidence).toBe('number');
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(100);
            
            expect(result).toHaveProperty('rawText');
            expect(result).toHaveProperty('timestamp');
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });

  describe('Property 12: Parser error handling', () => {
    /**
     * Feature: voice-mnee-transfer, Property 12: Parser error handling
     * Validates: Requirements 4.5
     * 
     * For any unparseable command (missing amount or recipient),
     * the AI Parser should return an error object with a descriptive message
     * indicating which field is missing.
     */
    it('should return error for commands missing amount', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.hexaString({ minLength: 40, maxLength: 40 }),
          async (addressHex) => {
            const recipient = `0x${addressHex}`;
            const command = `send tokens to ${recipient}`;

            mockGenerateContent.mockResolvedValueOnce({
              response: {
                candidates: [{
                  content: {
                    parts: [{
                      text: JSON.stringify({
                        action: 'transfer',
                        amount: 0,
                        recipient: recipient,
                        confidence: 0,
                        reasoning: 'Missing amount in command'
                      })
                    }]
                  }
                }]
              }
            });

            const result = await parseVoiceCommand(command);

            // Property: Missing amount should result in error
            expect(result.error).toBeDefined();
            expect(result.error.code).toBe('MISSING_PARAMETERS');
            expect(result.error.message).toContain('amount');
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should return error for commands missing recipient', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          async (amount) => {
            const command = `send ${amount} tokens`;

            mockGenerateContent.mockResolvedValueOnce({
              response: {
                candidates: [{
                  content: {
                    parts: [{
                      text: JSON.stringify({
                        action: 'transfer',
                        amount: amount,
                        recipient: '',
                        confidence: 0,
                        reasoning: 'Missing recipient address'
                      })
                    }]
                  }
                }]
              }
            });

            const result = await parseVoiceCommand(command);

            // Property: Missing recipient should result in error
            expect(result.error).toBeDefined();
            expect(result.error.code).toBe('MISSING_PARAMETERS');
            expect(result.error.message).toContain('recipient');
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should return error for ambiguous commands', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 50 }),
          async (ambiguousText) => {
            const command = `maybe ${ambiguousText}`;

            mockGenerateContent.mockResolvedValueOnce({
              response: {
                candidates: [{
                  content: {
                    parts: [{
                      text: JSON.stringify({
                        action: '',
                        amount: 0,
                        recipient: '',
                        confidence: 20,
                        reasoning: 'Command is too ambiguous to parse'
                      })
                    }]
                  }
                }]
              }
            });

            const result = await parseVoiceCommand(command);

            // Property: Ambiguous commands should return error
            expect(result.error).toBeDefined();
            expect(result.error.code).toMatch(/AMBIGUOUS_COMMAND|MISSING_PARAMETERS/);
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);
  });

  describe('Address Validation Tests', () => {
    it('should validate correct Ethereum addresses', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.hexaString({ minLength: 40, maxLength: 40 }),
          async (addressHex) => {
            const address = `0x${addressHex}`;
            const result = await validateAndResolveRecipient(address);

            // Property: Valid addresses should pass validation
            expect(result.valid).toBe(true);
            expect(result.address).toBe(address);
            expect(result.type).toBe('address');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid address formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'not-an-address',
            '0x123',
            '0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
            'random string',
            ''
          ),
          async (invalidAddress) => {
            const result = await validateAndResolveRecipient(invalidAddress);

            // Property: Invalid addresses should fail validation
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
