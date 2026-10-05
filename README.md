# VISION_AI — Voice-First Assistive PWA

VISION_AI is a production-quality, voice-first Progressive Web App engineered specifically for blind and low-vision individuals. It integrates continuous Gemini voice understanding, real-time client-side neural obstacle detection (TensorFlow.js COCO-SSD), high-accuracy GPS tracking, and turn-by-turn walking navigation with OpenStreetMap and Leaflet.

---

## Key Features

1. **Always-On Voice Assistant Powered by Gemini API**
   - Continuous microphone listening with on-device Voice Activity Detection (VAD) via `AudioContext` and `AnalyserNode`.
   - Pre-roll audio buffering (~300ms) and dynamic silence detection (~800ms) to package clean utterances.
   - Speech transcription and intent classification handled by Gemini with structured JSON output schema.
   - Auto-recovery with exponential backoff on stream disconnection, tab backgrounding, or AudioContext suspension.
   - Screen Wake Lock (`navigator.wakeLock`) keeps the display awake while listening.
   - Echo prevention: microphone mutes/discards audio during speech synthesis output while supporting loud user voice interruptions.
   - Typed simulation box allowing full testing without microphone access.

2. **Real-Time Offline Object Detection (TensorFlow.js + COCO-SSD)**
   - Rear camera stream (`facingMode: "environment"`) analyzed in a throttled animation loop (8–10 FPS).
   - Canvas bounding boxes with distinct color palette per object class (car = yellow-green, bicycle = red, person = magenta, traffic light = blue, truck = lime).
   - Obstacle intelligence: Direction classification (`"on your left"`, `"ahead"`, `"on your right"`) and distance estimation (`"very close"`, `"close"`, `"far"`).
   - Debounced spoken proximity warnings (max once every 4s per object, high priority for very close obstacles).
   - Audio proximity chirp using Web Audio API whose cadence and frequency scale as obstacles approach, combined with haptic vibration (`navigator.vibrate`).

3. **Live Location and Safe Walking Navigation**
   - High-accuracy geolocation tracking with distance walked metrics.
   - Turn-by-turn walking route computation using the OSRM public foot router.
   - Spoken distance announcements (`"In 50 metres, turn left"`) and 20m pre-turn proximity reminders.
   - Off-route detection (>30m) with automatic rerouting announcement.
   - Leaflet interactive map with custom pulsing blue position dot and cached OpenStreetMap tiles.

4. **Accessibility (WCAG AAA Compliance)**
   - Screen-reader first: ARIA labels on all interactive elements, dynamic `aria-live` status regions.
   - High-Contrast mode (WCAG AAA black and yellow palette) and Large-Text mode (up to 135%).
   - Minimum 56px touch target sizes for all primary actions.
   - Guided spoken onboarding on first launch for microphone, camera, and GPS permissions.

5. **Emergency SOS Beacon**
   - Red SOS button and voice intent `"EMERGENCY"` / `"SOS"`.
   - Generates live Google Maps coordinates link and broadcasts to trusted contact via Web Share API or clipboard.

---

## Architecture & File Structure

```
├── /components
│   ├── /common
│   │   ├── Header.tsx              # Top bar with search pill, mic pill, SOS, settings
│   │   ├── Sidebar.tsx             # Left sidebar (desktop) / bottom bar (mobile)
│   │   ├── PWAInstallButton.tsx    # In-app PWA install button with iOS instructions
│   │   └── AriaLiveRegion.tsx      # Hidden aria-live announcements for screen readers
│   ├── /dashboard
│   │   ├── StatCards.tsx           # Three top stat cards with sparklines
│   │   ├── CameraHeroCard.tsx      # Video canvas, bounding boxes, labels, FPS badge
│   │   ├── VoiceAssistantCard.tsx  # Waveform, mic meter, live transcript, intent, simulation box
│   │   ├── NavigationCard.tsx      # Leaflet map, route polyline, turn instructions
│   │   ├── ObstacleChartCard.tsx   # Recharts weekly activity smooth curve
│   │   ├── LiveDetectionsTable.tsx # Dark card (#14141C) table highlighting nearest obstacle
│   │   └── RecentActivitiesCard.tsx# Timeline of voice, camera, and navigation events
│   ├── /emergency
│   │   └── EmergencyModal.tsx      # Emergency contact editor and SOS broadcast
│   ├── /onboarding
│   │   └── SpokenOnboarding.tsx    # Spoken permissions walkthrough
│   └── /settings
│       └── SettingsModal.tsx       # Contrast, text size, speech rate/volume, and disclaimer
├── /hooks
│   ├── useContinuousMic.ts         # Always-on mic with VAD & auto-recovery
│   ├── useSpeechSynthesis.ts       # Text-to-speech with priority queue & echo prevention
│   ├── useCamera.ts                # Rear camera getUserMedia lifecycle
│   ├── useObjectDetection.ts       # COCO-SSD loading, bounding boxes, proximity alerts
│   ├── useGeolocation.ts           # watchPosition & reverse geocoding
│   ├── useNavigation.ts            # OSRM walking route, turn triggers, rerouting
│   ├── useWakeLock.ts              # Screen wake lock retention
│   └── usePWAInstall.ts            # PWA installation prompt hook
├── /services
│   ├── gemini.ts                   # Voice transcription & intent classification wrapper
│   ├── geocode.ts                  # Nominatim forward & reverse geocoding
│   └── routing.ts                  # OSRM walking directions calculation
├── /stores
│   └── useVisionStore.ts           # Zustand global state
├── /utils
│   ├── audioEncoder.ts             # Float32 PCM to 16-bit Mono WAV Base64 encoder
│   ├── audioBeep.ts                # Web Audio API proximity beeps & vibration
│   ├── direction.ts                # Horizontal spatial classification (left/ahead/right)
│   ├── distanceEstimation.ts       # Bounding box area ratio to distance & danger levels
│   └── intentRouter.ts             # Voice intent action dispatcher
├── server.ts                       # Express backend proxy for Gemini API & Vite dev server
└── vite.config.ts                  # Vite config with VitePWA and service worker caching
```

---

## Environment Variables & Setup

Create a `.env` file (copied from `.env.example`):

```bash
# GEMINI_API_KEY: Injected by AI Studio or set locally
GEMINI_API_KEY="your-gemini-api-key"

# VITE_GEMINI_MODEL: Model alias for voice understanding (default gemini-2.5-flash)
VITE_GEMINI_MODEL="gemini-2.5-flash"

# VITE_GEMINI_API_KEY: Optional direct client key fallback
VITE_GEMINI_API_KEY=""
```

### Installation & Run

```bash
# Install dependencies
npm install

# Run full-stack development server on port 3000
npm run dev

# Build production bundle
npm run build

# Start production server
npm run start
```

---

## Important Technical Considerations

### 1. HTTPS Requirement
Microphone (`navigator.mediaDevices.getUserMedia`), rear camera, Geolocation (`navigator.geolocation`), and Service Workers strictly require an **HTTPS** context (or `http://localhost` / `http://127.0.0.1` during development). In production deployments, ensure SSL/TLS is active.

### 2. Production Backend Proxy Advice
In production, never expose `GEMINI_API_KEY` to client browser bundles. This application includes an Express backend server (`server.ts`) with the `/api/voice/intent` route that securely handles audio transcription and classification on the server side using `@google/genai`.

### 3. Microphone & Background Limits in Browsers
Mobile operating systems (iOS Safari and Android Chrome) intentionally suspend Web Audio and microphone streams when the browser tab is minimized, the screen is locked, or the app is closed. VISION_AI mitigates this during active sessions by:
- Acquiring a Screen Wake Lock (`navigator.wakeLock`) so the screen stays active.
- Automatically recovering and restarting the microphone stream with exponential backoff whenever the app regains focus or audio resume events fire.

---

## Disclaimer
> **VISION_AI is an assistive tool and does not replace a white cane or guide dog.**
> Always maintain vigilance and physical environmental awareness when navigating outdoors.
