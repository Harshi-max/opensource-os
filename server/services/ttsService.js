import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { getApiConfig } from './aiMentorService.js';

// Simple text-to-speech helper which saves an MP3 file under /uploads
// Returns the public URL that can be used by clients to play the audio.
export const generateSpeech = async (text) => {
  if (!text || !text.trim()) {
    throw new Error('Text is required for TTS');
  }

  // normalize the text so the TTS engine doesn’t read every punctuation mark
  // separately.  This flattens line breaks, strips numbered list prefixes,
  // and collapses long runs of dots or whitespace.
  const prepareForSpeech = (str) => {
    let t = str;
    // flatten newlines and multiple spaces
    t = t.replace(/\s*\n+\s*/g, ' ');
    t = t.replace(/\s{2,}/g, ' ');
    // drop numbered list markers like “1. ” or “2. ”
    t = t.replace(/\b\d+\.\s*/g, '');
    // collapse ellipses/long dot sequences into a single period
    t = t.replace(/\.{2,}/g, '.');
    return t.trim();
  };

  text = prepareForSpeech(text);

  if (!text) {
    throw new Error('Text became empty after sanitization');
  }

  const { USE_GROQ, API_KEY } = getApiConfig();
  if (USE_GROQ) {
    // Groq does not currently support TTS; fall back to browser-side speech
    throw new Error('TTS not available when using Groq provider');
  }

  if (!API_KEY) {
    throw new Error('OpenAI API key missing, cannot generate speech');
  }

  // OpenAI TTS endpoint
  const url = 'https://api.openai.com/v1/audio/speech';
  const model = 'gpt-4o-mini-tts';

  // We request an MP3 stream
  const resp = await axios.post(
    url,
    { input: text, model },
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer',
    }
  );

  // Determine extension from content-type header
  const contentType = resp.headers['content-type'] || '';
  let ext = '.mp3';
  if (contentType.includes('ogg')) ext = '.ogg';
  else if (contentType.includes('wav')) ext = '.wav';

  const filename = `tts-${Date.now()}${ext}`;
  const outputPath = path.join('uploads', filename);

  // Ensure uploads directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(resp.data));

  // Return an absolute URL so clients can fetch the TTS file regardless of frontend dev server
  const serverBase = process.env.SERVER_URL || `http://localhost:5000`;
  return `${serverBase}/uploads/${filename}`;
};
