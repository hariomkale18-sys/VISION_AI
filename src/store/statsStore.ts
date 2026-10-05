import { create } from 'zustand';

export interface DailyStatPoint {
  date: string; // YYYY-MM-DD
  objects: number;
  distanceMeters: number;
  voiceCommands: number;
}

interface TrackedCandidate {
  className: string;
  cx: number;
  cy: number;
  consecutiveFrames: number;
  lastSeenTime: number;
}

interface CountedObject {
  className: string;
  cx: number;
  cy: number;
  countedTime: number;
}

interface StatsState {
  currentDate: string; // YYYY-MM-DD
  objectsDetectedToday: number;
  distanceWalkedMeters: number;
  voiceCommandsCount: number;
  dailyHistory: Record<string, DailyStatPoint>;

  // Actions
  recordObjectFrameDetections: (
    detections: Array<{ className: string; cx: number; cy: number }>
  ) => number; // returns count of newly confirmed unique objects
  addDistanceWalked: (meters: number) => void;
  incrementVoiceCommands: () => void;
  resetTodayStats: () => void;
  checkAndResetDay: () => void;

  // Comparison & sparklines
  getYesterdayComparison: (metric: 'objects' | 'distance' | 'voice') => {
    diff: number;
    text: string;
    hasYesterday: boolean;
  };
  getSparklineData: (metric: 'objects' | 'distance' | 'voice') => number[];
}

function getTodayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayKey(todayKey: string): string {
  const d = new Date(todayKey);
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const STORAGE_KEY = 'vision_ai_stats_v2';

function loadPersistedData(): {
  currentDate: string;
  objectsDetectedToday: number;
  distanceWalkedMeters: number;
  voiceCommandsCount: number;
  dailyHistory: Record<string, DailyStatPoint>;
} {
  const today = getTodayKey();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const storedDate = parsed.currentDate || today;
        const dailyHistory = parsed.dailyHistory || {};

        if (storedDate === today) {
          return {
            currentDate: today,
            objectsDetectedToday: Number(parsed.objectsDetectedToday) || 0,
            distanceWalkedMeters: Number(parsed.distanceWalkedMeters) || 0,
            voiceCommandsCount: Number(parsed.voiceCommandsCount) || 0,
            dailyHistory,
          };
        } else {
          // A new day has started! Archive previous day's final stats and reset today to 0
          dailyHistory[storedDate] = {
            date: storedDate,
            objects: Number(parsed.objectsDetectedToday) || 0,
            distanceMeters: Number(parsed.distanceWalkedMeters) || 0,
            voiceCommands: Number(parsed.voiceCommandsCount) || 0,
          };
          return {
            currentDate: today,
            objectsDetectedToday: 0,
            distanceWalkedMeters: 0,
            voiceCommandsCount: 0,
            dailyHistory,
          };
        }
      }
    }
  } catch (e) {
    console.warn('Failed to load stats from localStorage:', e);
  }

  return {
    currentDate: today,
    objectsDetectedToday: 0,
    distanceWalkedMeters: 0,
    voiceCommandsCount: 0,
    dailyHistory: {},
  };
}

function persistData(state: {
  currentDate: string;
  objectsDetectedToday: number;
  distanceWalkedMeters: number;
  voiceCommandsCount: number;
  dailyHistory: Record<string, DailyStatPoint>;
}) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save stats to localStorage:', e);
  }
}

// In-memory temporal object tracking (candidate frames & 5-second debounce by position)
let trackedCandidates: TrackedCandidate[] = [];
let recentlyCountedObjects: CountedObject[] = [];

export const useStatsStore = create<StatsState>((set, get) => {
  const initial = loadPersistedData();

  return {
    ...initial,

    checkAndResetDay: () => {
      const today = getTodayKey();
      const state = get();
      if (state.currentDate !== today) {
        const updatedHistory = { ...state.dailyHistory };
        updatedHistory[state.currentDate] = {
          date: state.currentDate,
          objects: state.objectsDetectedToday,
          distanceMeters: state.distanceWalkedMeters,
          voiceCommands: state.voiceCommandsCount,
        };

        const next = {
          currentDate: today,
          objectsDetectedToday: 0,
          distanceWalkedMeters: 0,
          voiceCommandsCount: 0,
          dailyHistory: updatedHistory,
        };
        persistData(next);
        set(next);
      }
    },

    recordObjectFrameDetections: (detections) => {
      get().checkAndResetDay();
      const now = Date.now();

      // Expire counted objects older than 5 seconds (5000ms)
      recentlyCountedObjects = recentlyCountedObjects.filter(
        (obj) => now - obj.countedTime < 5000
      );

      // Expire candidates not seen for > 800ms
      trackedCandidates = trackedCandidates.filter(
        (cand) => now - cand.lastSeenTime < 800
      );

      let newConfirmedCount = 0;
      const updatedCandidates: TrackedCandidate[] = [];

      for (const det of detections) {
        // Find existing candidate of same class within distance 0.18
        let matchedCandidateIndex = trackedCandidates.findIndex((cand) => {
          if (cand.className !== det.className) return false;
          const dx = cand.cx - det.cx;
          const dy = cand.cy - det.cy;
          return Math.sqrt(dx * dx + dy * dy) < 0.18;
        });

        let consecutiveFrames = 1;
        if (matchedCandidateIndex >= 0) {
          const matched = trackedCandidates[matchedCandidateIndex];
          consecutiveFrames = matched.consecutiveFrames + 1;
          trackedCandidates.splice(matchedCandidateIndex, 1);
        }

        updatedCandidates.push({
          className: det.className,
          cx: det.cx,
          cy: det.cy,
          consecutiveFrames,
          lastSeenTime: now,
        });

        // Check if candidate reached 3 consecutive frames
        if (consecutiveFrames === 3) {
          // Check if already counted within last 5s at similar position (< 0.22)
          const alreadyCounted = recentlyCountedObjects.some((counted) => {
            if (counted.className !== det.className) return false;
            const dx = counted.cx - det.cx;
            const dy = counted.cy - det.cy;
            return Math.sqrt(dx * dx + dy * dy) < 0.22;
          });

          if (!alreadyCounted) {
            newConfirmedCount++;
            recentlyCountedObjects.push({
              className: det.className,
              cx: det.cx,
              cy: det.cy,
              countedTime: now,
            });
          }
        }
      }

      trackedCandidates = updatedCandidates;

      if (newConfirmedCount > 0) {
        set((state) => {
          const nextCount = state.objectsDetectedToday + newConfirmedCount;
          const updated = {
            ...state,
            objectsDetectedToday: nextCount,
          };
          persistData(updated);
          return updated;
        });
      }

      return newConfirmedCount;
    },

    addDistanceWalked: (meters) => {
      get().checkAndResetDay();
      if (meters <= 0 || isNaN(meters)) return;
      set((state) => {
        const nextDist = Math.round(state.distanceWalkedMeters + meters);
        const updated = {
          ...state,
          distanceWalkedMeters: nextDist,
        };
        persistData(updated);
        return updated;
      });
    },

    incrementVoiceCommands: () => {
      get().checkAndResetDay();
      set((state) => {
        const nextCommands = state.voiceCommandsCount + 1;
        const updated = {
          ...state,
          voiceCommandsCount: nextCommands,
        };
        persistData(updated);
        return updated;
      });
    },

    resetTodayStats: () => {
      set((state) => {
        const updated = {
          ...state,
          objectsDetectedToday: 0,
          distanceWalkedMeters: 0,
          voiceCommandsCount: 0,
        };
        persistData(updated);
        return updated;
      });
      recentlyCountedObjects = [];
      trackedCandidates = [];
    },

    getYesterdayComparison: (metric) => {
      const state = get();
      const yesterdayKey = getYesterdayKey(state.currentDate);
      const yesterday = state.dailyHistory[yesterdayKey];

      if (!yesterday) {
        return {
          diff: 0,
          text: 'No data yet',
          hasYesterday: false,
        };
      }

      let todayVal = 0;
      let yestVal = 0;
      if (metric === 'objects') {
        todayVal = state.objectsDetectedToday;
        yestVal = yesterday.objects;
      } else if (metric === 'distance') {
        todayVal = state.distanceWalkedMeters;
        yestVal = yesterday.distanceMeters;
      } else if (metric === 'voice') {
        todayVal = state.voiceCommandsCount;
        yestVal = yesterday.voiceCommands;
      }

      const diff = todayVal - yestVal;
      let text = 'Same as yesterday';
      if (diff > 0) {
        if (metric === 'distance') {
          const diffKm = (diff / 1000).toFixed(1);
          text = `+${diffKm} km vs yesterday`;
        } else {
          text = `+${diff} vs yesterday`;
        }
      } else if (diff < 0) {
        if (metric === 'distance') {
          const diffKm = (Math.abs(diff) / 1000).toFixed(1);
          text = `-${diffKm} km vs yesterday`;
        } else {
          text = `${diff} vs yesterday`;
        }
      }

      return {
        diff,
        text,
        hasYesterday: true,
      };
    },

    getSparklineData: (metric) => {
      const state = get();
      const points: number[] = [];
      const today = new Date(state.currentDate);

      // Collect last 7 days (day - 6 to today)
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        const key = `${y}-${m}-${dayStr}`;

        if (key === state.currentDate) {
          if (metric === 'objects') points.push(state.objectsDetectedToday);
          else if (metric === 'distance') points.push(state.distanceWalkedMeters);
          else if (metric === 'voice') points.push(state.voiceCommandsCount);
        } else {
          const hist = state.dailyHistory[key];
          if (hist) {
            if (metric === 'objects') points.push(hist.objects);
            else if (metric === 'distance') points.push(hist.distanceMeters);
            else if (metric === 'voice') points.push(hist.voiceCommands);
          } else {
            points.push(0);
          }
        }
      }

      return points;
    },
  };
});
