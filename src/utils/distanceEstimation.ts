import { DangerLevel, DistanceType } from '../types';

export function calculateDistance(
  bboxWidth: number,
  bboxHeight: number,
  frameWidth: number,
  frameHeight: number
): { distance: DistanceType; estimatedMeters: number; areaRatio: number } {
  const boxArea = bboxWidth * bboxHeight;
  const frameArea = (frameWidth || 640) * (frameHeight || 480);
  const areaRatio = boxArea / frameArea;

  if (areaRatio > 0.16) {
    // Very close (< 1.5m)
    const estimatedMeters = Math.max(0.4, Math.round((1.4 - areaRatio * 1.2) * 10) / 10);
    return { distance: 'very close', estimatedMeters, areaRatio };
  } else if (areaRatio > 0.04) {
    // Close (1.5m - 3.5m)
    const estimatedMeters = Math.round((3.2 - (areaRatio - 0.04) * 15) * 10) / 10;
    return { distance: 'close', estimatedMeters: Math.max(1.5, estimatedMeters), areaRatio };
  } else {
    // Far (> 3.5m)
    const estimatedMeters = Math.round((6.5 - areaRatio * 40) * 10) / 10;
    return { distance: 'far', estimatedMeters: Math.max(3.5, estimatedMeters), areaRatio };
  }
}

export function getDangerLevel(className: string, distance: DistanceType): DangerLevel {
  const highRiskClasses = [
    'car',
    'truck',
    'bus',
    'motorcycle',
    'bicycle',
    'person',
    'train',
    'stop sign',
    'traffic light',
    'fire hydrant',
    'stairs',
    'pole',
  ];
  const isHighRisk = highRiskClasses.includes(className.toLowerCase());

  if (distance === 'very close') {
    return 'Danger';
  } else if (distance === 'close') {
    return isHighRisk ? 'Caution' : 'Safe';
  } else {
    return 'Safe';
  }
}

// Comprehensive color map for all 80 COCO-SSD object classes
const PRESET_CLASS_COLORS: Record<string, string> = {
  // People & Animals
  person: '#D946EF', // magenta
  cat: '#8B5CF6',
  dog: '#A855F7',
  horse: '#7C3AED',
  sheep: '#6366F1',
  cow: '#4F46E5',
  elephant: '#4338CA',
  bear: '#3730A3',
  zebra: '#312E81',
  giraffe: '#9333EA',
  bird: '#C084FC',

  // Vehicles
  car: '#84CC16', // yellow-green
  bicycle: '#EF4444', // red
  motorcycle: '#EC4899', // pink
  airplane: '#06B6D4',
  bus: '#F59E0B', // amber
  train: '#EA580C',
  truck: '#10B981', // emerald
  boat: '#0284C7',

  // Street & Outdoor
  'traffic light': '#3B82F6', // blue
  'fire hydrant': '#F43F5E',
  'stop sign': '#DC2626',
  'parking meter': '#64748B',
  bench: '#14B8A6',

  // Indoor & Furniture
  chair: '#F97316', // vibrant orange
  couch: '#0EA5E9',
  'potted plant': '#22C55E',
  bed: '#6366F1',
  'dining table': '#EAB308',
  toilet: '#06B6D4',
  tv: '#8B5CF6',
  laptop: '#38BDF8',
  mouse: '#A855F7',
  remote: '#F43F5E',
  keyboard: '#059669',
  'cell phone': '#2563EB',
  microwave: '#D97706',
  oven: '#B45309',
  toaster: '#78350F',
  sink: '#0284C7',
  refrigerator: '#0369A1',
  book: '#9333EA',
  clock: '#475569',
  vase: '#E11D48',
  scissors: '#E11D48',
  'teddy bear': '#F59E0B',
  'hair drier': '#EC4899',
  toothbrush: '#10B981',

  // Accessories & Items
  backpack: '#F59E0B',
  umbrella: '#06B6D4',
  handbag: '#EC4899',
  tie: '#3B82F6',
  suitcase: '#84CC16',
  frisbee: '#FACC15',
  skis: '#38BDF8',
  snowboard: '#60A5FA',
  'sports ball': '#F97316',
  kite: '#D946EF',
  'baseball bat': '#A16207',
  'baseball glove': '#CA8A04',
  skateboard: '#10B981',
  surfboard: '#06B6D4',
  'tennis racket': '#84CC16',

  // Food & Kitchenware
  bottle: '#06B6D4', // cyan
  'wine glass': '#E11D48',
  cup: '#F97316',
  fork: '#94A3B8',
  knife: '#64748B',
  spoon: '#94A3B8',
  bowl: '#F59E0B',
  banana: '#FACC15',
  apple: '#EF4444',
  sandwich: '#D97706',
  orange: '#F97316',
  broccoli: '#16A34A',
  carrot: '#EA580C',
  'hot dog': '#B91C1C',
  pizza: '#E11D48',
  donut: '#EC4899',
  cake: '#F43F5E',
};

export function getClassColor(className: string): string {
  const normalized = className.toLowerCase().trim();
  if (PRESET_CLASS_COLORS[normalized]) {
    return PRESET_CLASS_COLORS[normalized];
  }

  // Deterministic HSL color generator for any unrecognized classes
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 85%, 55%)`;
}
