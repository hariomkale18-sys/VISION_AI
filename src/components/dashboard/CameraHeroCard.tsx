import React, { useState } from 'react';
import {
  Camera,
  Eye,
  EyeOff,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Sliders,
  Sparkles,
  Terminal,
  Volume2,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { useVisionStore } from '../../stores/useVisionStore';

interface CameraHeroCardProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isCameraActive: boolean;
  onToggleDetection: () => void;
  onStartCamera: () => void;
  onDescribeScene: () => void;
}

export const CameraHeroCard: React.FC<CameraHeroCardProps> = ({
  videoRef,
  canvasRef,
  isCameraActive,
  onToggleDetection,
  onStartCamera,
  onDescribeScene,
}) => {
  const isDetecting = useVisionStore((s) => s.isDetecting);
  const isModelLoading = useVisionStore((s) => s.isModelLoading);
  const currentFps = useVisionStore((s) => s.currentFps);
  const detectedObjects = useVisionStore((s) => s.detectedObjects);
  const videoResolution = useVisionStore((s) => s.videoResolution);
  const detectionSettings = useVisionStore((s) => s.detectionSettings);
  const setDetectionSettings = useVisionStore((s) => s.setDetectionSettings);
  const isDescribingScene = useVisionStore((s) => s.isDescribingScene);
  const lastSceneDescription = useVisionStore((s) => s.lastSceneDescription);
  const highContrast = useVisionStore((s) => s.highContrast);

  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);

  // Check if any obstacle is 'very close'
  const dangerObstacle = detectedObjects.find((o) => o.distance === 'very close');

  return (
    <div
      className={`rounded-[24px] p-6 shadow-sm border transition relative overflow-hidden mb-6 ${
        highContrast
          ? 'bg-black text-white border-yellow-400 border-2'
          : 'bg-white border-slate-200/60'
      }`}
    >
      {/* Header with Title and Status Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-sky-400 flex items-center justify-center shadow-md">
            <Camera className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
                Live Camera & Obstacle Scanner
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {detectionSettings.modelBase === 'mobilenet_v2' ? 'Accurate (MobileNet v2)' : 'Fast (Lite)'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Detects all 80 object classes with distance and directional voice guidance
            </p>
          </div>
        </div>

        {/* Action Controls: Describe Scene, Settings, Debug, Detection Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Describe Scene Button (Gemini Vision Fallback) */}
          <button
            onClick={onDescribeScene}
            disabled={isDescribingScene || !isCameraActive}
            aria-label="Describe entire scene with Gemini Vision"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white shadow-sm transition min-h-[44px]"
          >
            {isDescribingScene ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="w-4 h-4 text-violet-200" aria-hidden="true" />
            )}
            <span>{isDescribingScene ? 'Analyzing Scene...' : 'Describe Scene'}</span>
          </button>

          {/* Toggle Detection Settings Button */}
          <button
            onClick={() => setShowSettingsPanel((prev) => !prev)}
            aria-label="Toggle detection sensitivity settings"
            className={`p-2.5 rounded-full border text-xs font-bold transition flex items-center gap-1 min-h-[44px] ${
              showSettingsPanel
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" aria-hidden="true" />
            {showSettingsPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Toggle Debug Overlay */}
          <button
            onClick={() => setShowDebugOverlay((prev) => !prev)}
            aria-label="Toggle detection debug metrics overlay"
            className={`p-2.5 rounded-full border text-xs font-bold transition min-h-[44px] ${
              showDebugOverlay
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
            title="Toggle Debug Metrics"
          >
            <Terminal className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* Start/Stop Detection Button */}
          <button
            onClick={onToggleDetection}
            disabled={isModelLoading}
            aria-label={
              isDetecting ? 'Stop object detection scanning' : 'Start object detection scanning'
            }
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-md transition min-h-[48px] focus:outline-none focus:ring-4 ${
              isDetecting
                ? 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-300'
            }`}
          >
            {isDetecting ? (
              <>
                <EyeOff className="w-4 h-4" aria-hidden="true" />
                <span>Stop Detection</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" aria-hidden="true" />
                <span>{isModelLoading ? 'Loading Vision Model...' : 'Start Detection'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Detection Settings Panel */}
      {showSettingsPanel && (
        <div className="mb-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-semibold animate-fade-in">
          {/* Confidence Slider */}
          <div>
            <div className="flex justify-between text-slate-700 mb-1">
              <span>Confidence Threshold:</span>
              <span className="font-bold text-blue-600">
                {Math.round(detectionSettings.confidenceThreshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="0.8"
              step="0.05"
              value={detectionSettings.confidenceThreshold}
              onChange={(e) =>
                setDetectionSettings({ confidenceThreshold: parseFloat(e.target.value) })
              }
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>More sensitive (20%)</span>
              <span>Stricter (80%)</span>
            </div>
          </div>

          {/* Model Toggle: Fast vs Accurate */}
          <div>
            <span className="text-slate-700 block mb-1.5">Vision Model Base:</span>
            <div className="flex rounded-xl bg-slate-200 p-0.5">
              <button
                type="button"
                onClick={() => setDetectionSettings({ modelBase: 'mobilenet_v2' })}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  detectionSettings.modelBase === 'mobilenet_v2'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Accurate (v2)
              </button>
              <button
                type="button"
                onClick={() => setDetectionSettings({ modelBase: 'lite_mobilenet_v2' })}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  detectionSettings.modelBase === 'lite_mobilenet_v2'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fast (Lite)
              </button>
            </div>
          </div>

          {/* Toggle Speak Far Objects */}
          <div className="flex flex-col justify-between">
            <span className="text-slate-700 block mb-1">Spoken Voice Alerts:</span>
            <label className="flex items-center gap-2 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={detectionSettings.speakFarObjects}
                onChange={(e) => setDetectionSettings({ speakFarObjects: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500"
              />
              <span className="text-slate-700">Speak far objects as well</span>
            </label>
            <span className="text-[10px] text-slate-400 mt-0.5">
              (By default speaks very close & close first)
            </span>
          </div>
        </div>
      )}

      {/* Gemini Scene Description Result Card */}
      {lastSceneDescription && (
        <div className="mb-4 p-4 rounded-2xl bg-violet-50/80 border border-violet-200/80 text-violet-950 flex items-start gap-3 animate-fade-in shadow-xs">
          <Sparkles className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <div className="text-[11px] font-bold text-violet-700 uppercase tracking-wider mb-0.5">
              Gemini Vision Scene Analysis (Stairs, Walls, Poles & Pathways)
            </div>
            <p className="text-xs sm:text-sm font-semibold leading-relaxed">
              {lastSceneDescription}
            </p>
          </div>
        </div>
      )}

      {/* Video & Canvas Hero Frame with Exact Aspect-Ratio */}
      <div className="relative w-full aspect-video sm:aspect-16/9 bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
        {/* Hidden/Active Video Element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Bounding Box Drawing Canvas (Pixel-perfect overlay) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
        />

        {/* Camera inactive overlay */}
        {!isCameraActive && (
          <div className="absolute inset-0 z-20 bg-slate-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white">
            <Camera className="w-12 h-12 text-slate-500 mb-3" aria-hidden="true" />
            <h3 className="text-base font-bold mb-1">Camera Stream Standby</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Tap below to turn on the rear camera for obstacle detection and surroundings description.
            </p>
            <button
              onClick={onStartCamera}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-full transition shadow-md min-h-[48px]"
            >
              Enable Rear Camera
            </button>
          </div>
        )}

        {/* Urgent Danger Overlay Alert */}
        {dangerObstacle && (
          <div className="absolute top-4 left-4 right-4 z-20 bg-rose-600/90 backdrop-blur-md text-white px-4 py-2.5 rounded-xl flex items-center justify-between shadow-lg border border-rose-400/50 animate-bounce">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-white" aria-hidden="true" />
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wide">
                Warning: {dangerObstacle.class} {dangerObstacle.direction} — Very Close!
              </span>
            </div>
            <span className="text-xs bg-white text-rose-700 font-bold px-2 py-0.5 rounded-md">
              DANGER
            </span>
          </div>
        )}

        {/* Debug Overlay (Toggleable via button) */}
        {showDebugOverlay && (
          <div className="absolute top-4 left-4 z-30 bg-black/85 text-emerald-400 p-3 rounded-xl font-mono text-[11px] space-y-1 backdrop-blur-md border border-emerald-500/40 max-w-xs pointer-events-none">
            <div className="font-bold text-white border-b border-emerald-500/30 pb-1 mb-1 flex justify-between">
              <span>DEBUG OVERLAY</span>
              <span>{currentFps} FPS</span>
            </div>
            <div>
              Resolution:{' '}
              {videoResolution.width > 0
                ? `${videoResolution.width} × ${videoResolution.height}`
                : 'Initializing...'}
            </div>
            <div>Objects In View: {detectedObjects.length}</div>
            <div className="max-h-24 overflow-y-auto pt-1 space-y-0.5">
              {detectedObjects.length === 0 ? (
                <div className="text-slate-500">None detected</div>
              ) : (
                detectedObjects.map((o, idx) => (
                  <div key={idx} className="truncate">
                    • {o.class}: {o.confidence}% ({o.distance})
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Direction Guides Overlay Grid (Left / Ahead / Right) */}
        {isDetecting && (
          <div className="absolute bottom-2 left-4 right-4 z-20 flex justify-between pointer-events-none">
            <span className="text-[11px] font-bold text-white/80 bg-black/50 px-2.5 py-1 rounded-md backdrop-blur-xs">
              Left
            </span>
            <span className="text-[11px] font-bold text-white/80 bg-black/50 px-2.5 py-1 rounded-md backdrop-blur-xs">
              Ahead (Path)
            </span>
            <span className="text-[11px] font-bold text-white/80 bg-black/50 px-2.5 py-1 rounded-md backdrop-blur-xs">
              Right
            </span>
          </div>
        )}
      </div>

      {/* Safety Notice Footer */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
          <span>Haptic vibration & audio pitch active during close proximity.</span>
        </span>
        <span className="italic text-slate-400">
          Assistive tool — does not replace white cane or guide dog.
        </span>
      </div>
    </div>
  );
};
