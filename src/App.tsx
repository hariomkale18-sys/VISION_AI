import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  WifiOff,
} from 'lucide-react';
import { useVisionStore } from './stores/useVisionStore';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { useContinuousMic } from './hooks/useContinuousMic';
import { useCamera } from './hooks/useCamera';
import { useObjectDetection } from './hooks/useObjectDetection';
import { useGeolocation } from './hooks/useGeolocation';
import { useNavigation } from './hooks/useNavigation';
import { useWakeLock } from './hooks/useWakeLock';
import { routeVoiceIntent } from './utils/intentRouter';
import { classifyLocalIntent } from './services/gemini';
import { VoiceIntentResult } from './types';

// Components
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { AriaLiveRegion } from './components/common/AriaLiveRegion';
import { StatCards } from './components/dashboard/StatCards';
import { CameraHeroCard } from './components/dashboard/CameraHeroCard';
import { VoiceAssistantCard } from './components/dashboard/VoiceAssistantCard';
import { NavigationCard } from './components/dashboard/NavigationCard';
import { LiveDetectionsTable } from './components/dashboard/LiveDetectionsTable';
import { RecentActivitiesCard } from './components/dashboard/RecentActivitiesCard';
import { EmergencyModal } from './components/emergency/EmergencyModal';
import { SpokenOnboarding } from './components/onboarding/SpokenOnboarding';
import { SettingsModal } from './components/settings/SettingsModal';

export default function App() {
  const activeTab = useVisionStore((s) => s.activeTab);
  const highContrast = useVisionStore((s) => s.highContrast);
  const largeText = useVisionStore((s) => s.largeText);
  const hasCompletedOnboarding = useVisionStore((s) => s.hasCompletedOnboarding);
  const setHasCompletedOnboarding = useVisionStore((s) => s.setHasCompletedOnboarding);
  const isListening = useVisionStore((s) => s.isListening);
  const isDetecting = useVisionStore((s) => s.isDetecting);

  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Online / Offline tracking
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 1. Text-to-Speech
  const { speak, cancelSpeech } = useSpeechSynthesis();

  // 2. Camera & Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { videoRef, isCameraActive, startCamera, stopCamera } = useCamera();

  // 3. Object Detection (COCO-SSD with full 80 classes & Gemini Vision fallback)
  const { startDetection, stopDetection, describeScene } = useObjectDetection(
    videoRef,
    canvasRef,
    speak
  );

  // 4. GPS Geolocation & Distance Tracker (Filtered accuracy & speed)
  useGeolocation();

  // 5. Walking Navigation
  const { navigateToDestination, stopNavigation } = useNavigation(speak);

  // 6. Voice Intent Dispatcher
  const handleExecuteIntent = useCallback(
    (result: VoiceIntentResult) => {
      routeVoiceIntent(result, {
        speak,
        startDetection: async () => {
          if (!isCameraActive) {
            await startCamera();
          }
          await startDetection();
        },
        stopDetection: () => {
          stopDetection();
        },
        navigateToDestination: (dest) => {
          navigateToDestination(dest);
        },
        stopNavigation: () => {
          stopNavigation();
        },
        stopMic: () => {
          stopMic();
        },
        triggerEmergency: () => {
          setIsEmergencyOpen(true);
        },
        describeScene: () => {
          describeScene();
        },
      });
    },
    [describeScene, isCameraActive, navigateToDestination, speak, startCamera, startDetection, stopDetection, stopNavigation]
  );

  // 7. Continuous Always-On Microphone
  const { startMic, stopMic } = useContinuousMic(
    speak,
    cancelSpeech,
    handleExecuteIntent
  );

  // 8. Screen Wake Lock
  useWakeLock(isListening || isDetecting);

  // Toggle Camera Object Detection
  const handleToggleDetection = async () => {
    if (isDetecting) {
      stopDetection();
    } else {
      if (!isCameraActive) {
        await startCamera();
      }
      await startDetection();
    }
  };

  // Simulated Voice Command via Text or Chips
  const handleSimulateCommand = (text: string) => {
    const intentResult = classifyLocalIntent(text);
    handleExecuteIntent(intentResult);
  };

  // Top Bar Search Trigger (Address or Intent)
  const handleSearchSubmit = (query: string) => {
    const lower = query.toLowerCase();
    if (
      lower.startsWith('to ') ||
      lower.includes('station') ||
      lower.includes('park') ||
      lower.includes('street') ||
      lower.includes('avenue') ||
      lower.includes('hospital') ||
      lower.includes('shop')
    ) {
      navigateToDestination(query);
    } else {
      handleSimulateCommand(query);
    }
  };

  return (
    <div
      className={`min-h-screen bg-[#E8EAF3] py-3 sm:py-6 px-2 sm:px-4 md:px-6 transition-colors duration-200 ${
        highContrast ? 'high-contrast' : ''
      } ${largeText ? 'large-text' : ''}`}
    >
      {/* Screen Reader ARIA Live Announcements */}
      <AriaLiveRegion />

      {/* Offline Toast Banner */}
      {!isOnline && (
        <div
          role="status"
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-pulse"
        >
          <WifiOff className="w-4 h-4" aria-hidden="true" />
          <span>Offline Mode — On-device vision & cached maps remain active.</span>
        </div>
      )}

      {/* First Launch Guided Spoken Onboarding */}
      {!hasCompletedOnboarding && (
        <SpokenOnboarding
          onComplete={() => setHasCompletedOnboarding(true)}
          speak={speak}
          onStartMic={startMic}
          onStartCamera={startCamera}
        />
      )}

      {/* Main Soft-UI Dashboard Container (Rounded 32px with layered depth) */}
      <div className="max-w-7xl mx-auto bg-[#F4F5FA] rounded-[32px] p-4 sm:p-6 lg:p-8 shadow-2xl border border-white/70 relative">
        {/* Top Header Bar */}
        <Header
          onStartMic={startMic}
          onStopMic={stopMic}
          onSearchSubmit={handleSearchSubmit}
          onOpenEmergency={() => setIsEmergencyOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Sidebar + Main Content Layout */}
        <div className="flex gap-6 pb-20 lg:pb-0">
          {/* Left Navigation Sidebar */}
          <Sidebar
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenEmergency={() => setIsEmergencyOpen(true)}
          />

          {/* Main Content Area */}
          <main className="flex-1 w-full overflow-hidden" role="main">
            {/* Views Switcher */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* 1. Three Stat Cards (Real Live Data) */}
                <StatCards />

                {/* 2. Rebalanced Grid: Live Camera Hero Card & Live Detections Table Fill Space Seamlessly */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  <div className="xl:col-span-7">
                    <CameraHeroCard
                      videoRef={videoRef}
                      canvasRef={canvasRef}
                      isCameraActive={isCameraActive}
                      onToggleDetection={handleToggleDetection}
                      onStartCamera={startCamera}
                      onDescribeScene={describeScene}
                    />
                  </div>
                  <div className="xl:col-span-5">
                    <LiveDetectionsTable />
                  </div>
                </div>

                {/* 3. Grid: Voice Assistant & Navigation Cards */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <VoiceAssistantCard
                    onStartMic={startMic}
                    onStopMic={stopMic}
                    onSimulateCommand={handleSimulateCommand}
                  />

                  <NavigationCard
                    onSearchDestination={navigateToDestination}
                    onStopNavigation={stopNavigation}
                  />
                </div>

                {/* 4. Recent Activities List (Real Live Events) */}
                <RecentActivitiesCard />
              </div>
            )}

            {activeTab === 'detection' && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                <div className="xl:col-span-7">
                  <CameraHeroCard
                    videoRef={videoRef}
                    canvasRef={canvasRef}
                    isCameraActive={isCameraActive}
                    onToggleDetection={handleToggleDetection}
                    onStartCamera={startCamera}
                    onDescribeScene={describeScene}
                  />
                </div>
                <div className="xl:col-span-5">
                  <LiveDetectionsTable />
                </div>
              </div>
            )}

            {activeTab === 'navigation' && (
              <div className="space-y-6">
                <NavigationCard
                  onSearchDestination={navigateToDestination}
                  onStopNavigation={stopNavigation}
                />
                <StatCards />
              </div>
            )}

            {activeTab === 'voice' && (
              <div className="space-y-6">
                <VoiceAssistantCard
                  onStartMic={startMic}
                  onStopMic={stopMic}
                  onSimulateCommand={handleSimulateCommand}
                />
                <RecentActivitiesCard />
              </div>
            )}

            {/* Mandatory Accessibility & Safety Disclaimer */}
            <footer className="mt-8 pt-4 border-t border-slate-200/80 text-center text-xs text-slate-500 font-semibold leading-relaxed">
              <p>
                VISION_AI is an assistive tool and does not replace a white cane or guide dog.
                Engineered with Gemini voice reasoning, offline COCO-SSD neural vision, and Leaflet turn-by-turn guidance.
              </p>
            </footer>
          </main>
        </div>
      </div>

      {/* Mobile Floating Giant Mic Button (Bottom Center) */}
      <div className="lg:hidden fixed bottom-18 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={isListening ? () => stopMic(true) : () => startMic()}
          aria-label={
            isListening ? 'Stop microphone listening' : 'Start microphone listening'
          }
          className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl transition transform active:scale-95 focus:outline-none focus:ring-4 ${
            isListening
              ? 'bg-rose-600 focus:ring-rose-300 ring-4 ring-rose-300/40 animate-pulse'
              : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300 ring-4 ring-blue-300/40'
          }`}
        >
          {isListening ? (
            <MicOff className="w-8 h-8" aria-hidden="true" />
          ) : (
            <Mic className="w-8 h-8" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Emergency SOS Modal */}
      <EmergencyModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
        speak={speak}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        speak={speak}
      />
    </div>
  );
}
