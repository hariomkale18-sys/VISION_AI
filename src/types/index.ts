export type IntentType =
  | 'START_DETECTION'
  | 'STOP_DETECTION'
  | 'DESCRIBE_SURROUNDINGS'
  | 'WHERE_AM_I'
  | 'NAVIGATE'
  | 'STOP_NAVIGATION'
  | 'REPEAT'
  | 'HELP'
  | 'VOLUME_UP'
  | 'VOLUME_DOWN'
  | 'SPEECH_SLOWER'
  | 'SPEECH_FASTER'
  | 'STOP_LISTENING'
  | 'EMERGENCY'
  | 'UNKNOWN';

export interface VoiceIntentResult {
  transcript: string;
  language?: string;
  intent: IntentType;
  params?: {
    destination?: string;
    [key: string]: any;
  };
  confidence: number;
  error?: string;
}

export type DirectionType = 'on your left' | 'ahead' | 'on your right';
export type DistanceType = 'very close' | 'close' | 'far';
export type DangerLevel = 'Danger' | 'Caution' | 'Safe';

export interface DetectedObstacle {
  id: string;
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
  direction: DirectionType;
  distance: DistanceType;
  estimatedMeters: number;
  dangerLevel: DangerLevel;
  timestamp: number;
  color: string;
}

export interface NavigationStep {
  instruction: string;
  distance: number; // in meters
  duration: number; // in seconds
  location: [number, number]; // [lat, lng]
  type: string;
  modifier?: string;
}

export interface NavigationRoute {
  destinationName: string;
  destinationCoords: [number, number]; // [lat, lng]
  coordinates: [number, number][]; // polyline points [lat, lng]
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  steps: NavigationStep[];
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
  customMessage: string;
}

export interface RecentActivityItem {
  id: string;
  action: string;
  details: string;
  time: string;
  status: 'Completed' | 'Pending' | 'Active';
  iconType: 'mic' | 'camera' | 'nav' | 'emergency' | 'system';
}

export interface DetectionSettings {
  confidenceThreshold: number; // 0.2 to 0.8 (default 0.4)
  speakFarObjects: boolean; // default false
  modelBase: 'mobilenet_v2' | 'lite_mobilenet_v2'; // default mobilenet_v2 (Accurate)
  showDebugOverlay: boolean;
}
