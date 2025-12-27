import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// Initialize Google Cloud Text-to-Speech client
// It will automatically use GOOGLE_APPLICATION_CREDENTIALS from .env
const client = new TextToSpeechClient();

/**
 * Synthesize speech from text using Google Cloud Text-to-Speech
 * @param {string} text - Text to convert to speech
 * @param {string} voiceName - Optional voice name (defaults to Journey-D)
 * @returns {Promise<Buffer|null>} Audio buffer or null if failed
 */
export async function synthesizeSpeech(text, voiceName = 'en-US-Journey-D') {
  try {
    // Create the request object
    const request = {
      input: { text: text },
      // Use a high-quality "Journey" or "Neural2" voice
      voice: { 
        languageCode: 'en-US', 
        name: voiceName, 
        ssmlGender: 'MALE' 
      },
      audioConfig: { 
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0.0,
        volumeGainDb: 0.0
      },
    };

    // Call Google Cloud Text-to-Speech API
    const [response] = await client.synthesizeSpeech(request);
    
    // Return the audio content as Buffer
    return Buffer.from(response.audioContent);
  } catch (error) {
    console.error('Google Cloud TTS error, returning null:', error.message);
    return null;
  }
}

/**
 * Get available voices (stub for compatibility)
 * @returns {Promise<Array>} Empty array (Google Cloud has many voices, but we'll keep it simple)
 */
export async function getAvailableVoices() {
  // Return empty array to prevent frontend errors
  // In a real implementation, you could call client.listVoices()
  return [];
}

/**
 * Synthesize spooky trading alert
 * @param {string} message - Trading alert message
 * @returns {Promise<Buffer|null>} Audio buffer or null if failed
 */
export async function synthesizeTradingAlert(message) {
  const spookyMessage = `👻 Kaseddie AI Alert: ${message}`;
  return synthesizeSpeech(spookyMessage);
}

/**
 * Get user info (stub for compatibility)
 * @returns {Promise<Object|null>} Null (not applicable for Google Cloud TTS)
 */
export async function getUserInfo() {
  // Return null since Google Cloud TTS doesn't have user info concept like ElevenLabs
  return null;
}
