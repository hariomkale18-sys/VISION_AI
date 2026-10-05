import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Allow large audio payload (base64 audio from VAD recording)
app.use(express.json({ limit: '25mb' }));

// Shared Gemini client instance with required User-Agent header
const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const VOICE_SYSTEM_INSTRUCTION = `You are the voice brain of VISION_AI, a voice-first assistive application for blind and low-vision users.
You receive a short user voice clip (or text command). The user may speak English, Hindi, Marathi, or mixed code-switching.
Task:
1. Transcribe the user's speech exactly.
2. Classify the user's intent into one of the allowed intent codes:
   - START_DETECTION: Turn on camera obstacle detection (e.g., "start detection", "detect objects", "look around", "dekho", "camera on")
   - STOP_DETECTION: Turn off camera obstacle detection (e.g., "stop detection", "band karo")
   - DESCRIBE_SURROUNDINGS: Describe what's in front of the camera or general surroundings (e.g., "what's ahead", "kya hai samne", "describe surroundings")
   - WHERE_AM_I: Ask for current address and live location (e.g., "where am I", "meri location kya hai", "kaha hu main")
   - NAVIGATE: Ask to navigate or walk to a destination (e.g., "take me to Central Park", "navigate to pharmacy", "station chalo", params.destination should be destination name)
   - STOP_NAVIGATION: Cancel active route/navigation (e.g., "stop navigation", "cancel route")
   - REPEAT: Repeat the last instruction or obstacle alert (e.g., "repeat", "say again", "phir se bolo")
   - HELP: List voice commands and guide the user (e.g., "help", "what can you do", "madad")
   - VOLUME_UP: Increase voice response volume
   - VOLUME_DOWN: Decrease voice response volume
   - SPEECH_SLOWER: Slow down speech rate
   - SPEECH_FASTER: Speed up speech rate
   - STOP_LISTENING: Turn off microphone listening (e.g., "stop listening", "mic off", "shant raho")
   - EMERGENCY: Trigger SOS / send location alert to emergency contact (e.g., "emergency", "help me", "sos", "bachao", "send my location")
   - UNKNOWN: Unclear, silence, or unrelated intent

Return ONLY JSON matching the provided schema.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    transcript: {
      type: Type.STRING,
      description: 'Exact transcribed speech in original or Romanized script',
    },
    language: {
      type: Type.STRING,
      description: 'Language detected, e.g. English, Hindi, Marathi, Mixed',
    },
    intent: {
      type: Type.STRING,
      description:
        'One of: START_DETECTION, STOP_DETECTION, DESCRIBE_SURROUNDINGS, WHERE_AM_I, NAVIGATE, STOP_NAVIGATION, REPEAT, HELP, VOLUME_UP, VOLUME_DOWN, SPEECH_SLOWER, SPEECH_FASTER, STOP_LISTENING, EMERGENCY, UNKNOWN',
    },
    params: {
      type: Type.OBJECT,
      properties: {
        destination: {
          type: Type.STRING,
          description: 'Destination place name if intent is NAVIGATE',
        },
      },
    },
    confidence: {
      type: Type.NUMBER,
      description: 'Confidence score between 0.0 and 1.0',
    },
  },
  required: ['transcript', 'intent', 'confidence'],
};

// API Route: Voice Intent & Transcription
app.post('/api/voice/intent', async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType = 'audio/wav', textCommand } = req.body;

    if (!audioBase64 && !textCommand) {
      res.status(400).json({ error: 'Either audioBase64 or textCommand is required.' });
      return;
    }

    // Check if Gemini API is available
    if (!ai) {
      // Graceful fallback heuristics if key is not injected in dev
      const simulated = simulateIntent(textCommand || 'hello vision');
      res.json(simulated);
      return;
    }

    const modelName = process.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

    let parts: any[] = [];
    if (audioBase64) {
      parts.push({
        inlineData: {
          mimeType: mimeType || 'audio/wav',
          data: audioBase64,
        },
      });
      parts.push({
        text: 'Listen to this audio clip, transcribe it, and identify the user intent for VISION_AI.',
      });
    } else {
      parts.push({
        text: `Classify this user voice command for VISION_AI: "${textCommand}"`,
      });
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        systemInstruction: VOICE_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.1,
      },
    });

    const text = response.text?.trim() || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        transcript: textCommand || 'Audio processed',
        intent: 'UNKNOWN',
        confidence: 0.5,
        params: {},
      };
    }

    res.json(parsed);
  } catch (error: any) {
    console.error('Gemini Voice Intent Error:', error?.message || error);
    // Provide a safe fallback response so client doesn't crash
    res.status(200).json({
      transcript: req.body.textCommand || 'Voice audio input',
      language: 'Unknown',
      intent: 'UNKNOWN',
      params: {},
      confidence: 0.3,
      error: error?.message || 'Voice understanding error',
    });
  }
});

// API Route: Describe Scene with Gemini Vision
app.post('/api/voice/describe-scene', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: 'imageBase64 is required.' });
      return;
    }

    if (!ai) {
      res.json({
        description: 'Camera view active. The path ahead appears open with normal indoor lighting.',
      });
      return;
    }

    const modelName = process.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

    const promptText =
      'You are helping a blind person walk safely. In 2 short sentences, describe the obstacles and hazards in front of them, with their direction (left, ahead, right) and approximate distance. Mention stairs, poles, walls, doors, vehicles, people and ground hazards.';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        temperature: 0.2,
      },
    });

    const description =
      response.text?.trim() ||
      'No immediate hazardous obstacles detected in view. Proceed forward carefully.';

    res.json({ description });
  } catch (error: any) {
    console.error('Describe scene vision error:', error?.message || error);
    res.status(200).json({
      description: 'Unable to analyze scene at this moment. Please proceed with caution.',
      error: error?.message,
    });
  }
});

// Heuristic fallback for offline/simulated mode
function simulateIntent(text: string) {
  const lower = text.toLowerCase().trim();
  let intent = 'UNKNOWN';
  let destination = '';

  if (lower.includes('start detection') || lower.includes('detect') || lower.includes('look') || lower.includes('camera on') || lower.includes('dekho')) {
    intent = 'START_DETECTION';
  } else if (lower.includes('stop detection') || lower.includes('camera off') || lower.includes('band karo')) {
    intent = 'STOP_DETECTION';
  } else if (lower.includes('describe') || lower.includes('what is ahead') || lower.includes("what's in front") || lower.includes('samne kya hai')) {
    intent = 'DESCRIBE_SURROUNDINGS';
  } else if (lower.includes('where am i') || lower.includes('current location') || lower.includes('kaha hu')) {
    intent = 'WHERE_AM_I';
  } else if (lower.includes('navigate to') || lower.includes('take me to') || lower.includes('walk to') || lower.includes('direction to') || lower.includes('chalo')) {
    intent = 'NAVIGATE';
    const match = lower.match(/(?:navigate to|take me to|walk to|direction to|chalo)\s+(.+)/i);
    destination = match ? match[1].trim() : 'Central Park';
  } else if (lower.includes('stop navigation') || lower.includes('cancel route') || lower.includes('stop nav')) {
    intent = 'STOP_NAVIGATION';
  } else if (lower.includes('repeat') || lower.includes('again') || lower.includes('phir se')) {
    intent = 'REPEAT';
  } else if (lower.includes('help') || lower.includes('commands') || lower.includes('madad')) {
    intent = 'HELP';
  } else if (lower.includes('louder') || lower.includes('volume up')) {
    intent = 'VOLUME_UP';
  } else if (lower.includes('quieter') || lower.includes('volume down')) {
    intent = 'VOLUME_DOWN';
  } else if (lower.includes('slower') || lower.includes('slow down')) {
    intent = 'SPEECH_SLOWER';
  } else if (lower.includes('faster') || lower.includes('speed up')) {
    intent = 'SPEECH_FASTER';
  } else if (lower.includes('stop listening') || lower.includes('mic off') || lower.includes('stop mic') || lower.includes('mute mic')) {
    intent = 'STOP_LISTENING';
  } else if (lower.includes('emergency') || lower.includes('sos') || lower.includes('help me') || lower.includes('bachao')) {
    intent = 'EMERGENCY';
  }

  return {
    transcript: text,
    language: 'English',
    intent,
    params: destination ? { destination } : {},
    confidence: intent === 'UNKNOWN' ? 0.4 : 0.95,
  };
}

// Development with Vite middleware or Production static files
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[VISION_AI Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
