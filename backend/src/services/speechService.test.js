import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { transcribeAudio, validateAudioQuality, transcribeAudioWithRetry } from './speechService.js';

// Mock the Google Cloud Speech client
vi.mock('@google-cloud/speech', () => {
  return {
    SpeechClient: vi.fn().mockImplementation(() => ({
      recognize: vi.fn()
    }))
  };
});

describe('Speech Service Property-Based Tests', () => {
  let mockRecognize;

  beforeEach(async () => {
    // Get the mocked recognize function
    const { SpeechClient } = await import('@google-cloud/speech');
    const clientInstance = new SpeechClient();
    mockRecognize = clientInstance.recognize;
    vi.clearAllMocks();
  });

  describe('Property 6: Speech-to-text conversion', () => {
    /**
     * Feature: voice-mnee-transfer, Property 6: Speech-to-text conversion
     * Validates: Requirements 3.2
     * 
     * For any valid audio input, the speech-to-text service should return a non-empty text string.
     */
    it('should return non-empty text for any valid audio buffer', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid audio buffers (at least 1KB, max 10KB for testing)
          fc.uint8Array({ minLength: 1024, maxLength: 10240 }),
          // Generate random transcription text
          fc.string({ minLength: 1, maxLength: 500 }),
          async (audioData, transcriptionText) => {
            // Create a buffer from the generated data
            const audioBuffer = Buffer.from(audioData);

            // Mock the Google Cloud API response
            mockRecognize.mockResolvedValueOnce([
              {
                results: [
                  {
                    alternatives: [
                      {
                        transcript: transcriptionText
                      }
                    ]
                  }
                ]
              }
            ]);

            // Call the transcribeAudio function
            const result = await transcribeAudio(audioBuffer);

            // Property: Result should be a non-empty string
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
            expect(result.trim()).toBe(transcriptionText.trim());
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    it('should handle various audio encoding options', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1024, maxLength: 10240 }),
          fc.constantFrom('LINEAR16', 'FLAC', 'WEBM_OPUS', 'OGG_OPUS'),
          fc.integer({ min: 8000, max: 48000 }),
          fc.constantFrom('en-US', 'es-ES', 'fr-FR', 'de-DE'),
          fc.string({ minLength: 1, maxLength: 200 }),
          async (audioData, encoding, sampleRate, languageCode, transcriptionText) => {
            const audioBuffer = Buffer.from(audioData);

            mockRecognize.mockResolvedValueOnce([
              {
                results: [
                  {
                    alternatives: [
                      {
                        transcript: transcriptionText
                      }
                    ]
                  }
                ]
              }
            ]);

            const result = await transcribeAudio(audioBuffer, {
              encoding,
              sampleRateHertz: sampleRate,
              languageCode
            });

            // Property: Should return non-empty text regardless of options
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject empty or invalid audio buffers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            Buffer.alloc(0), // Empty buffer
            null,
            undefined
          ),
          async (invalidBuffer) => {
            // Property: Invalid buffers should throw an error
            await expect(transcribeAudio(invalidBuffer)).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw error when no speech is detected', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1024, maxLength: 10240 }),
          async (audioData) => {
            const audioBuffer = Buffer.from(audioData);

            // Mock empty transcription response
            mockRecognize.mockResolvedValueOnce([
              {
                results: []
              }
            ]);

            // Property: Should throw error when no speech detected
            await expect(transcribeAudio(audioBuffer)).rejects.toThrow('No speech detected');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Audio Quality Validation', () => {
    it('should validate audio buffer size constraints', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1024, max: 100 * 1024 * 1024 }),
          async (size) => {
            const audioBuffer = Buffer.alloc(size);
            const isValid = await validateAudioQuality(audioBuffer);
            
            // Property: Buffers within size limits should be valid
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject buffers that are too small', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1023 }),
          async (size) => {
            const audioBuffer = Buffer.alloc(size);
            const isValid = await validateAudioQuality(audioBuffer);
            
            // Property: Buffers below minimum size should be invalid
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Retry Logic', () => {
    it('should eventually succeed after transient failures', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1024, maxLength: 10240 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.integer({ min: 1, max: 3 }),
          async (audioData, transcriptionText, failureCount) => {
            const audioBuffer = Buffer.from(audioData);

            // Mock failures followed by success
            for (let i = 0; i < failureCount; i++) {
              mockRecognize.mockRejectedValueOnce(new Error('Transient API error'));
            }
            mockRecognize.mockResolvedValueOnce([
              {
                results: [
                  {
                    alternatives: [
                      {
                        transcript: transcriptionText
                      }
                    ]
                  }
                ]
              }
            ]);

            // Property: Should succeed after retries
            const result = await transcribeAudioWithRetry(audioBuffer, {}, 3);
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 } // Fewer runs due to retry delays
      );
    }, 30000); // Increase timeout for retry tests
  });
});
