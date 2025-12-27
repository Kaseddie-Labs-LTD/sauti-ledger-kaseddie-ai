import express from 'express';
import { transcribeAudioWithRetry } from '../services/speechService.js';
import { parseVoiceCommand } from '../services/commandParserService.js';

const router = express.Router();

/**
 * POST /api/voice/transcribe - Transcribe audio to text
 * Accepts audio file uploads and returns transcribed text
 */
router.post('/transcribe', express.raw({ type: 'audio/*', limit: '10mb' }), async (req, res) => {
  try {
    // Check if audio data is present
    if (!req.body || req.body.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Audio data is required'
        }
      });
    }

    // Get audio buffer from request
    const audioBuffer = Buffer.from(req.body);

    // Extract audio options from query parameters or headers
    const options = {
      encoding: req.query.encoding || req.headers['x-audio-encoding'] || 'WEBM_OPUS',
      sampleRateHertz: parseInt(req.query.sampleRate || req.headers['x-sample-rate'] || '48000'),
      languageCode: req.query.language || req.headers['x-language-code'] || 'en-US'
    };

    // Transcribe audio with retry logic
    const transcription = await transcribeAudioWithRetry(audioBuffer, options);

    // Return transcribed text
    res.json({
      transcription,
      timestamp: new Date().toISOString(),
      audioSize: audioBuffer.length,
      options
    });
  } catch (error) {
    console.error('Transcription endpoint error:', error.message);

    // Handle specific error types
    if (error.message.includes('quality') || error.message.includes('empty')) {
      return res.status(400).json({
        error: {
          code: 'INVALID_AUDIO',
          message: error.message
        }
      });
    }

    if (error.message.includes('No speech detected')) {
      return res.status(400).json({
        error: {
          code: 'NO_SPEECH_DETECTED',
          message: 'No speech was detected in the audio. Please try again.'
        }
      });
    }

    // Generic error response
    res.status(500).json({
      error: {
        code: 'TRANSCRIPTION_FAILED',
        message: 'Failed to transcribe audio. Please try again.'
      }
    });
  }
});

/**
 * POST /api/voice/parse - Parse voice command text
 * Accepts transcribed text and returns structured ParsedCommand object
 */
router.post('/parse', express.json(), async (req, res) => {
  try {
    // Check if text is present in request body
    if (!req.body || !req.body.text) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Text field is required in request body'
        }
      });
    }

    const { text } = req.body;

    // Validate text is a non-empty string
    if (typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_TEXT',
          message: 'Text must be a non-empty string'
        }
      });
    }

    console.log(`[Parse Endpoint] Parsing command: "${text}"`);

    // Parse the voice command
    const result = await parseVoiceCommand(text);

    // Check if parsing returned an error
    if (result.error) {
      // Return appropriate status code based on error type
      const statusCode = result.error.code === 'AMBIGUOUS_COMMAND' ? 400 : 
                         result.error.code === 'MISSING_PARAMETERS' ? 400 : 500;
      
      return res.status(statusCode).json(result);
    }

    // Return successfully parsed command
    res.json(result);

  } catch (error) {
    console.error('[Parse Endpoint] Error:', error.message);

    // Generic error response
    res.status(500).json({
      error: {
        code: 'PARSING_FAILED',
        message: 'Failed to parse voice command. Please try again.',
        details: error.message
      }
    });
  }
});

export default router;
