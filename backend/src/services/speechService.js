import { SpeechClient } from '@google-cloud/speech';

// Initialize Google Cloud Speech-to-Text client
// It will automatically use GOOGLE_APPLICATION_CREDENTIALS from .env
const client = new SpeechClient();

/**
 * Transcribe audio to text using Google Cloud Speech-to-Text
 * @param {Buffer} audioBuffer - Audio data buffer
 * @param {Object} options - Transcription options
 * @param {string} options.encoding - Audio encoding (LINEAR16, FLAC, MULAW, etc.)
 * @param {number} options.sampleRateHertz - Sample rate in Hz
 * @param {string} options.languageCode - Language code (default: en-US)
 * @returns {Promise<string>} Transcribed text
 */
export async function transcribeAudio(audioBuffer, options = {}) {
  try {
    const {
      encoding = 'WEBM_OPUS',
      sampleRateHertz = 48000,
      languageCode = 'en-US'
    } = options;

    // Validate audio buffer
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Audio buffer is empty or invalid');
    }

    // Create the request object
    const audio = {
      content: audioBuffer.toString('base64')
    };

    const config = {
      encoding,
      sampleRateHertz,
      languageCode,
      enableAutomaticPunctuation: true,
      model: 'default',
      useEnhanced: true
    };

    const request = {
      audio,
      config
    };

    // Call Google Cloud Speech-to-Text API
    const [response] = await client.recognize(request);
    
    // Extract transcription from response
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    if (!transcription || transcription.trim().length === 0) {
      throw new Error('No speech detected in audio');
    }

    return transcription.trim();
  } catch (error) {
    console.error('Google Cloud Speech-to-Text error:', error.message);
    throw error;
  }
}

/**
 * Validate audio quality before transcription
 * @param {Buffer} audioBuffer - Audio data buffer
 * @returns {Promise<boolean>} True if quality is sufficient
 */
export async function validateAudioQuality(audioBuffer) {
  try {
    // Basic validation checks
    if (!audioBuffer || audioBuffer.length === 0) {
      return false;
    }

    // Check minimum audio size (at least 1KB)
    if (audioBuffer.length < 1024) {
      return false;
    }

    // Check maximum audio size (100MB limit for Google Cloud)
    if (audioBuffer.length > 100 * 1024 * 1024) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Audio quality validation error:', error.message);
    return false;
  }
}

/**
 * Transcribe audio with retry logic
 * @param {Buffer} audioBuffer - Audio data buffer
 * @param {Object} options - Transcription options
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise<string>} Transcribed text
 */
export async function transcribeAudioWithRetry(audioBuffer, options = {}, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Validate audio quality first
      const isValid = await validateAudioQuality(audioBuffer);
      if (!isValid) {
        throw new Error('Audio quality is insufficient');
      }

      // Attempt transcription
      const transcription = await transcribeAudio(audioBuffer, options);
      return transcription;
    } catch (error) {
      lastError = error;
      console.error(`Transcription attempt ${attempt} failed:`, error.message);
      
      // Don't retry on validation errors
      if (error.message.includes('quality') || error.message.includes('empty')) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed
  throw new Error(`Transcription failed after ${maxRetries} attempts: ${lastError.message}`);
}
