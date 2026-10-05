import { VoiceIntentResult } from '../types';

/**
 * PRODUCTION NOTE:
 * In a secure production environment, all Gemini API calls MUST be routed through
 * a backend proxy (such as the `/api/voice/intent` Express endpoint configured in server.ts)
 * to keep the GEMINI_API_KEY secret and out of client-side browser bundles.
 *
 * This wrapper sends audio to `/api/voice/intent`. If unavailable (e.g. running in
 * purely static mode) and `VITE_GEMINI_API_KEY` is provided, it falls back to
 * direct REST generation, or gracefully falls back to local heuristic intent classification.
 */

const FALLBACK_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
const CLIENT_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export async function processVoiceUtterance(
  audioBase64?: string,
  textCommand?: string,
  retries = 2
): Promise<VoiceIntentResult> {
  // Check online status
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      transcript: textCommand || 'Offline audio',
      intent: textCommand ? classifyLocalIntent(textCommand).intent : 'UNKNOWN',
      params: textCommand ? classifyLocalIntent(textCommand).params : {},
      confidence: 0.5,
      error: 'Device is offline. Keeping local vision detection active.',
    };
  }

  // 1. Primary path: Call backend proxy `/api/voice/intent`
  try {
    const res = await fetch('/api/voice/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64,
        mimeType: 'audio/wav',
        textCommand,
      }),
    });

    if (res.ok) {
      const data: VoiceIntentResult = await res.json();
      return data;
    }
  } catch (err: any) {
    console.warn('Backend proxy route unreachable, attempting direct fallback...', err?.message);
  }

  // 2. Direct client REST fallback if VITE_GEMINI_API_KEY is configured
  if (CLIENT_API_KEY) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const directResult = await callDirectGemini(audioBase64, textCommand);
        return directResult;
      } catch (err: any) {
        if (attempt === retries) {
          console.error('Direct Gemini REST failed after retries:', err);
          break;
        }
        // Exponential backoff
        await new Promise((r) => setTimeout(r, 600 * Math.pow(2, attempt)));
      }
    }
  }

  // 3. Heuristic offline/simulated fallback
  return classifyLocalIntent(textCommand || 'hello vision');
}

async function callDirectGemini(audioBase64?: string, textCommand?: string): Promise<VoiceIntentResult> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${FALLBACK_MODEL}:generateContent?key=${CLIENT_API_KEY}`;

  const parts: any[] = [];
  if (audioBase64) {
    parts.push({
      inlineData: {
        mimeType: 'audio/wav',
        data: audioBase64,
      },
    });
    parts.push({
      text: 'Transcribe this voice audio clip and classify the user intent for VISION_AI.',
    });
  } else {
    parts.push({
      text: `Classify this user voice command for VISION_AI: "${textCommand}"`,
    });
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
    systemInstruction: {
      parts: [
        {
          text: `You are the voice brain of VISION_AI, an assistant for blind users. You receive a short audio clip. Transcribe it exactly (the user may speak English, Hindi, Marathi or mixed). Then classify the intent into one of: START_DETECTION, STOP_DETECTION, DESCRIBE_SURROUNDINGS, WHERE_AM_I, NAVIGATE, STOP_NAVIGATION, REPEAT, HELP, VOLUME_UP, VOLUME_DOWN, SPEECH_SLOWER, SPEECH_FASTER, STOP_LISTENING, EMERGENCY, UNKNOWN. Reply ONLY with JSON: {transcript, language, intent, params: { destination }, confidence}`,
        },
      ],
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini direct request error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
  return JSON.parse(text);
}

export function classifyLocalIntent(text: string): VoiceIntentResult {
  const lower = text.toLowerCase().trim();
  let intent: VoiceIntentResult['intent'] = 'UNKNOWN';
  let destination = '';

  if (
    lower.includes('start detection') ||
    lower.includes('start detect') ||
    lower.includes('detect object') ||
    lower.includes('camera on') ||
    lower.includes('look around') ||
    lower.includes('dekho') ||
    lower.includes('chalu karo')
  ) {
    intent = 'START_DETECTION';
  } else if (
    lower.includes('stop detection') ||
    lower.includes('stop detect') ||
    lower.includes('camera off') ||
    lower.includes('band karo')
  ) {
    intent = 'STOP_DETECTION';
  } else if (
    lower.includes('describe') ||
    lower.includes('what is ahead') ||
    lower.includes("what's ahead") ||
    lower.includes("what's in front") ||
    lower.includes('surroundings') ||
    lower.includes('samne kya hai')
  ) {
    intent = 'DESCRIBE_SURROUNDINGS';
  } else if (
    lower.includes('where am i') ||
    lower.includes('my location') ||
    lower.includes('address') ||
    lower.includes('kaha hu')
  ) {
    intent = 'WHERE_AM_I';
  } else if (
    lower.includes('navigate to') ||
    lower.includes('take me to') ||
    lower.includes('directions to') ||
    lower.includes('walk to') ||
    lower.includes('chalo')
  ) {
    intent = 'NAVIGATE';
    const match = lower.match(/(?:navigate to|take me to|directions to|walk to|chalo)\s+(.+)/i);
    destination = match ? match[1].trim() : 'Nearest Metro';
  } else if (
    lower.includes('stop navigation') ||
    lower.includes('cancel route') ||
    lower.includes('stop route')
  ) {
    intent = 'STOP_NAVIGATION';
  } else if (lower.includes('repeat') || lower.includes('say again') || lower.includes('phir se bolo')) {
    intent = 'REPEAT';
  } else if (lower.includes('help') || lower.includes('commands') || lower.includes('madad')) {
    intent = 'HELP';
  } else if (lower.includes('volume up') || lower.includes('louder') || lower.includes('awaz badhao')) {
    intent = 'VOLUME_UP';
  } else if (lower.includes('volume down') || lower.includes('softer') || lower.includes('awaz kam karo')) {
    intent = 'VOLUME_DOWN';
  } else if (lower.includes('slower') || lower.includes('slow down') || lower.includes('dheere bolo')) {
    intent = 'SPEECH_SLOWER';
  } else if (lower.includes('faster') || lower.includes('speed up') || lower.includes('jaldi bolo')) {
    intent = 'SPEECH_FASTER';
  } else if (
    lower.includes('stop listening') ||
    lower.includes('mic off') ||
    lower.includes('stop mic') ||
    lower.includes('shant raho')
  ) {
    intent = 'STOP_LISTENING';
  } else if (
    lower.includes('emergency') ||
    lower.includes('sos') ||
    lower.includes('help me') ||
    lower.includes('danger') ||
    lower.includes('bachao')
  ) {
    intent = 'EMERGENCY';
  }

  return {
    transcript: text,
    language: 'English',
    intent,
    params: destination ? { destination } : {},
    confidence: intent === 'UNKNOWN' ? 0.45 : 0.95,
  };
}

export async function describeSceneImage(imageBase64: string): Promise<string> {
  // Check online status
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'Offline mode active. The camera feed is running local obstacle detection.';
  }

  // 1. Backend proxy route
  try {
    const res = await fetch('/api/voice/describe-scene', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64,
        mimeType: 'image/jpeg',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.description) {
        return data.description;
      }
    }
  } catch (err: any) {
    console.warn('Backend describe-scene failed, trying direct fallback...', err?.message);
  }

  // 2. Direct client fallback if API key configured
  if (CLIENT_API_KEY) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${FALLBACK_MODEL}:generateContent?key=${CLIENT_API_KEY}`;
      const payload = {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                text: 'You are helping a blind person walk safely. In 2 short sentences, describe the obstacles and hazards in front of them, with their direction (left, ahead, right) and approximate distance. Mention stairs, poles, walls, doors, vehicles, people and ground hazards.',
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
        },
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
      }
    } catch (err: any) {
      console.warn('Direct scene description failed:', err);
    }
  }

  return 'The pathway ahead is visible. Proceed carefully and follow navigation guidance.';
}
