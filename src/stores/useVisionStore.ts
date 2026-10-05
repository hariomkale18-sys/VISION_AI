import { create } from 'zustand';
import {
  DetectedObstacle,
  DetectionSettings,
  EmergencyContact,
  IntentType,
  NavigationRoute,
  RecentActivityItem,
} from '../types';

interface VisionState {
  // Navigation / View Tab
  activeTab: 'dashboard' | 'detection' | 'navigation' | 'voice' | 'emergency' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'detection' | 'navigation' | 'voice' | 'emergency' | 'settings') => void;

  // Onboarding
  hasCompletedOnboarding: boolean;
  onboardingStep: number;
  setHasCompletedOnboarding: (val: boolean) => void;
  setOnboardingStep: (step: number) => void;

  // Assistant & Mic State
  isListening: boolean;
  isProcessingVoice: boolean;
  micLevel: number; // 0 to 100
  lastTranscript: string;
  lastIntent: IntentType | null;
  lastResponse: string;
  micStatusText: string;
  ariaAnnouncement: string;
  setListening: (val: boolean) => void;
  setProcessingVoice: (val: boolean) => void;
  setMicLevel: (lvl: number) => void;
  setVoiceResult: (transcript: string, intent: IntentType, response: string) => void;
  setMicStatusText: (text: string) => void;
  announceAria: (text: string) => void;

  // TTS State
  isSpeaking: boolean;
  speechRate: number; // 0.7 to 1.5
  speechVolume: number; // 0.1 to 1.0
  preferredLanguage: string; // 'en-US' | 'hi-IN' | 'mr-IN'
  setIsSpeaking: (val: boolean) => void;
  setSpeechRate: (rate: number | ((prev: number) => number)) => void;
  setSpeechVolume: (vol: number | ((prev: number) => number)) => void;
  setPreferredLanguage: (lang: string) => void;

  // Object Detection State
  isDetecting: boolean;
  isModelLoading: boolean;
  isModelLoaded: boolean;
  detectedObjects: DetectedObstacle[];
  currentFps: number;
  videoResolution: { width: number; height: number };
  detectionSettings: DetectionSettings;
  setDetecting: (val: boolean) => void;
  setModelLoading: (val: boolean) => void;
  setModelLoaded: (val: boolean) => void;
  setDetectedObjects: (objects: DetectedObstacle[]) => void;
  setCurrentFps: (fps: number) => void;
  setVideoResolution: (res: { width: number; height: number }) => void;
  setDetectionSettings: (settings: Partial<DetectionSettings>) => void;

  // Gemini Vision Fallback (Scene Description)
  isDescribingScene: boolean;
  lastSceneDescription: string;
  setIsDescribingScene: (val: boolean) => void;
  setLastSceneDescription: (desc: string) => void;

  // Navigation State
  userLocation: [number, number] | null; // [lat, lng]
  userHeading: number | null;
  userAddress: string;
  destinationQuery: string;
  activeRoute: NavigationRoute | null;
  isNavigating: boolean;
  currentStepIndex: number;
  remainingDistanceMeters: number;
  etaMinutes: number;
  setUserLocation: (loc: [number, number]) => void;
  setUserHeading: (heading: number | null) => void;
  setUserAddress: (address: string) => void;
  setDestinationQuery: (q: string) => void;
  setActiveRoute: (route: NavigationRoute | null) => void;
  setNavigating: (val: boolean) => void;
  setCurrentStepIndex: (idx: number) => void;
  setRemainingDistanceMeters: (dist: number) => void;
  setEtaMinutes: (eta: number) => void;

  // Accessibility
  highContrast: boolean;
  largeText: boolean;
  setHighContrast: (val: boolean) => void;
  setLargeText: (val: boolean) => void;

  // Emergency
  emergencyContact: EmergencyContact;
  setEmergencyContact: (contact: Partial<EmergencyContact>) => void;

  // Real Activities Timeline (starts empty!)
  recentActivities: RecentActivityItem[];
  addRecentActivity: (activity: Omit<RecentActivityItem, 'id' | 'time'>) => void;
}

export const useVisionStore = create<VisionState>((set) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),

  hasCompletedOnboarding: (() => {
    try {
      return localStorage.getItem('vision_ai_onboarded') === 'true';
    } catch {
      return false;
    }
  })(),
  onboardingStep: 0,
  setHasCompletedOnboarding: (val) => {
    try {
      localStorage.setItem('vision_ai_onboarded', String(val));
    } catch {}
    set({ hasCompletedOnboarding: val });
  },
  setOnboardingStep: (step) => set({ onboardingStep: step }),

  // Assistant
  isListening: false,
  isProcessingVoice: false,
  micLevel: 0,
  lastTranscript: 'Tap Start Listening or say "Start listening"',
  lastIntent: null,
  lastResponse: 'VISION_AI is standing by. Press Start Listening to begin.',
  micStatusText: 'Microphone Standby',
  ariaAnnouncement: '',
  setListening: (val) => set({ isListening: val }),
  setProcessingVoice: (val) => set({ isProcessingVoice: val }),
  setMicLevel: (lvl) => set({ micLevel: Math.min(100, Math.max(0, lvl)) }),
  setVoiceResult: (transcript, intent, response) =>
    set({
      lastTranscript: transcript,
      lastIntent: intent,
      lastResponse: response,
      ariaAnnouncement: response,
    }),
  setMicStatusText: (text) => set({ micStatusText: text }),
  announceAria: (text) => set({ ariaAnnouncement: text }),

  // TTS
  isSpeaking: false,
  speechRate: 1.0,
  speechVolume: 1.0,
  preferredLanguage: 'en-US',
  setIsSpeaking: (val) => set({ isSpeaking: val }),
  setSpeechRate: (rate) =>
    set((state) => ({
      speechRate: typeof rate === 'function' ? Math.max(0.7, Math.min(1.5, rate(state.speechRate))) : Math.max(0.7, Math.min(1.5, rate)),
    })),
  setSpeechVolume: (vol) =>
    set((state) => ({
      speechVolume: typeof vol === 'function' ? Math.max(0.1, Math.min(1.0, vol(state.speechVolume))) : Math.max(0.1, Math.min(1.0, vol)),
    })),
  setPreferredLanguage: (lang) => set({ preferredLanguage: lang }),

  // Detection
  isDetecting: false,
  isModelLoading: false,
  isModelLoaded: false,
  detectedObjects: [],
  currentFps: 0,
  videoResolution: { width: 0, height: 0 },
  detectionSettings: {
    confidenceThreshold: 0.4,
    speakFarObjects: false,
    modelBase: 'mobilenet_v2', // Default Accurate
    showDebugOverlay: false,
  },
  setDetecting: (val) => set({ isDetecting: val }),
  setModelLoading: (val) => set({ isModelLoading: val }),
  setModelLoaded: (val) => set({ isModelLoaded: val }),
  setDetectedObjects: (objects) => set({ detectedObjects: objects }),
  setCurrentFps: (fps) => set({ currentFps: fps }),
  setVideoResolution: (res) => set({ videoResolution: res }),
  setDetectionSettings: (settings) =>
    set((state) => ({
      detectionSettings: { ...state.detectionSettings, ...settings },
    })),

  // Gemini Vision Fallback (Scene Description)
  isDescribingScene: false,
  lastSceneDescription: '',
  setIsDescribingScene: (val) => set({ isDescribingScene: val }),
  setLastSceneDescription: (desc) => set({ lastSceneDescription: desc }),

  // Navigation
  userLocation: null,
  userHeading: null,
  userAddress: 'Detecting current address...',
  destinationQuery: '',
  activeRoute: null,
  isNavigating: false,
  currentStepIndex: 0,
  remainingDistanceMeters: 0,
  etaMinutes: 0,
  setUserLocation: (loc) => set({ userLocation: loc }),
  setUserHeading: (heading) => set({ userHeading: heading }),
  setUserAddress: (address) => set({ userAddress: address }),
  setDestinationQuery: (q) => set({ destinationQuery: q }),
  setActiveRoute: (route) => set({ activeRoute: route }),
  setNavigating: (val) => set({ isNavigating: val }),
  setCurrentStepIndex: (idx) => set({ currentStepIndex: idx }),
  setRemainingDistanceMeters: (dist) => set({ remainingDistanceMeters: dist }),
  setEtaMinutes: (eta) => set({ etaMinutes: eta }),

  // Accessibility
  highContrast: (() => {
    try {
      return localStorage.getItem('vision_ai_high_contrast') === 'true';
    } catch {
      return false;
    }
  })(),
  largeText: (() => {
    try {
      return localStorage.getItem('vision_ai_large_text') === 'true';
    } catch {
      return false;
    }
  })(),
  setHighContrast: (val) => {
    try {
      localStorage.setItem('vision_ai_high_contrast', String(val));
    } catch {}
    set({ highContrast: val });
  },
  setLargeText: (val) => {
    try {
      localStorage.setItem('vision_ai_large_text', String(val));
    } catch {}
    set({ largeText: val });
  },

  // Emergency Contact
  emergencyContact: (() => {
    try {
      const saved = localStorage.getItem('vision_ai_emergency_contact');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      name: 'Sarah Connor',
      phone: '+1 555-0199',
      relationship: 'Sister',
      customMessage: 'Emergency alert from VISION_AI: I need assistance. My live coordinates and Google Maps link are below.',
    };
  })(),
  setEmergencyContact: (contact) =>
    set((state) => {
      const updated = { ...state.emergencyContact, ...contact };
      try {
        localStorage.setItem('vision_ai_emergency_contact', JSON.stringify(updated));
      } catch {}
      return { emergencyContact: updated };
    }),

  // Real Activities Timeline (starts empty, populated only by real events!)
  recentActivities: [],
  addRecentActivity: (activity) =>
    set((state) => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newItem: RecentActivityItem = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        time: timeStr,
        ...activity,
      };
      return {
        recentActivities: [newItem, ...state.recentActivities.slice(0, 19)],
      };
    }),
}));
