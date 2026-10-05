import { VoiceIntentResult } from '../types';
import { useVisionStore } from '../stores/useVisionStore';
import { useStatsStore } from '../store/statsStore';

interface IntentContext {
  speak: (text: string, isUrgent?: boolean) => void;
  startDetection: () => void;
  stopDetection: () => void;
  navigateToDestination: (dest: string) => void;
  stopNavigation: () => void;
  stopMic: () => void;
  triggerEmergency: () => void;
  describeScene: () => void;
}

export function routeVoiceIntent(result: VoiceIntentResult, ctx: IntentContext) {
  const { intent, transcript, params } = result;
  const store = useVisionStore.getState();

  // Increment voice commands count ONLY when command is recognized (not UNKNOWN)
  if (intent !== 'UNKNOWN') {
    useStatsStore.getState().incrementVoiceCommands();
  }

  let responseText = '';

  switch (intent) {
    case 'START_DETECTION':
      ctx.startDetection();
      responseText = 'Object detection activated. Scanning your path for obstacles.';
      break;

    case 'STOP_DETECTION':
      ctx.stopDetection();
      responseText = 'Object detection stopped.';
      break;

    case 'DESCRIBE_SURROUNDINGS': {
      ctx.describeScene();
      responseText = 'Analyzing surroundings with Gemini vision...';
      break;
    }

    case 'WHERE_AM_I': {
      const address = store.userAddress || 'Locating address...';
      responseText = `You are near ${address}`;
      ctx.speak(responseText);
      break;
    }

    case 'NAVIGATE': {
      const destination = params?.destination || 'Nearest Transit';
      ctx.navigateToDestination(destination);
      responseText = `Calculating walking directions to ${destination}`;
      break;
    }

    case 'STOP_NAVIGATION':
      ctx.stopNavigation();
      responseText = 'Walking navigation cancelled.';
      break;

    case 'REPEAT':
      responseText = store.lastResponse || 'VISION_AI is standing by.';
      ctx.speak(responseText);
      break;

    case 'HELP':
      responseText =
        'You can say: Start detection, Stop detection, Describe surroundings, Where am I, Navigate to destination, Louder, Softer, Slower, Faster, Emergency, or Stop listening.';
      ctx.speak(responseText);
      break;

    case 'VOLUME_UP':
      store.setSpeechVolume((v) => Math.min(1.0, v + 0.2));
      responseText = 'Volume increased.';
      ctx.speak(responseText);
      break;

    case 'VOLUME_DOWN':
      store.setSpeechVolume((v) => Math.max(0.2, v - 0.2));
      responseText = 'Volume decreased.';
      ctx.speak(responseText);
      break;

    case 'SPEECH_SLOWER':
      store.setSpeechRate((r) => Math.max(0.7, r - 0.15));
      responseText = 'Speaking slower now.';
      ctx.speak(responseText);
      break;

    case 'SPEECH_FASTER':
      store.setSpeechRate((r) => Math.min(1.5, r + 0.15));
      responseText = 'Speaking faster now.';
      ctx.speak(responseText);
      break;

    case 'STOP_LISTENING':
      ctx.stopMic();
      responseText = 'Microphone turned off. Tap Start Listening to resume.';
      ctx.speak(responseText);
      break;

    case 'EMERGENCY':
      ctx.triggerEmergency();
      responseText = 'Emergency alert triggered. Sharing your live location.';
      break;

    case 'UNKNOWN':
    default:
      responseText = 'Sorry, I did not understand, please say it again.';
      ctx.speak(responseText);
      break;
  }

  store.setVoiceResult(transcript, intent, responseText);

  if (intent !== 'UNKNOWN') {
    store.addRecentActivity({
      action: `Voice: ${intent}`,
      details: transcript,
      status: 'Completed',
      iconType: 'mic',
    });
  }
}
