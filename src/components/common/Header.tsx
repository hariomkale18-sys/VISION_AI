import React, { useState } from 'react';
import { Search, Mic, MicOff, AlertCircle, Bell, Settings, ShieldAlert } from 'lucide-react';
import { useVisionStore } from '../../stores/useVisionStore';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  onStartMic: () => void;
  onStopMic: () => void;
  onSearchSubmit: (query: string) => void;
  onOpenEmergency: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onStartMic,
  onStopMic,
  onSearchSubmit,
  onOpenEmergency,
  onOpenSettings,
}) => {
  const isListening = useVisionStore((s) => s.isListening);
  const isProcessingVoice = useVisionStore((s) => s.isProcessingVoice);
  const micLevel = useVisionStore((s) => s.micLevel);
  const highContrast = useVisionStore((s) => s.highContrast);

  const [inputVal, setInputVal] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onSearchSubmit(inputVal.trim());
      setInputVal('');
    }
  };

  return (
    <header className="w-full flex flex-col md:flex-row items-center justify-between gap-4 mb-6 pt-2">
      {/* Search pill */}
      <form
        onSubmit={handleSubmit}
        className="w-full md:w-96 flex items-center bg-white rounded-full px-4 py-2.5 shadow-sm border border-slate-200/70 focus-within:ring-2 focus-within:ring-blue-500 transition"
      >
        <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" aria-hidden="true" />
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Search destination or type command..."
          aria-label="Search destination or type voice command"
          className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none font-medium"
        />
        {inputVal && (
          <button
            type="submit"
            aria-label="Execute search"
            className="text-xs bg-blue-600 text-white font-semibold rounded-full px-3 py-1 ml-1 hover:bg-blue-700 transition"
          >
            Go
          </button>
        )}
      </form>

      {/* Right controls: Mic status pill, SOS button, PWA, Settings */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 flex-wrap justify-end w-full md:w-auto">
        {/* Prominent Mic Status Pill */}
        <button
          onClick={isListening ? onStopMic : onStartMic}
          aria-label={isListening ? 'Microphone is active. Tap to turn off.' : 'Microphone is paused. Tap to start listening.'}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-sm transition min-h-[48px] focus:outline-none focus:ring-4 ${
            isListening
              ? highContrast
                ? 'bg-yellow-400 text-black border-2 border-black focus:ring-yellow-300'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-300 animate-pulse'
              : highContrast
              ? 'bg-black text-yellow-400 border-2 border-yellow-400 focus:ring-yellow-400'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-blue-300'
          }`}
        >
          {isListening ? (
            <>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
              <Mic className="w-4 h-4" aria-hidden="true" />
              <span>{isProcessingVoice ? 'Processing...' : 'Listening'}</span>
              {/* Dynamic waveform meter dots */}
              <div className="flex items-center gap-0.5 ml-1">
                <span
                  className="w-1 bg-white rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(6, (micLevel / 100) * 18)}px` }}
                />
                <span
                  className="w-1 bg-white rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(8, (micLevel / 100) * 22)}px` }}
                />
                <span
                  className="w-1 bg-white rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(6, (micLevel / 100) * 16)}px` }}
                />
              </div>
            </>
          ) : (
            <>
              <MicOff className="w-4 h-4 text-slate-400" aria-hidden="true" />
              <span>Start Listening</span>
            </>
          )}
        </button>

        {/* SOS Emergency Button */}
        <button
          onClick={onOpenEmergency}
          aria-label="Emergency SOS: Send live GPS location to emergency contact"
          className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition focus:outline-none focus:ring-4 focus:ring-rose-300 min-h-[48px]"
        >
          <ShieldAlert className="w-4 h-4 animate-bounce" aria-hidden="true" />
          <span>SOS</span>
        </button>

        {/* In-App PWA Install */}
        <PWAInstallButton />

        {/* Circular Action Icons */}
        <button
          onClick={onOpenSettings}
          aria-label="Open VISION_AI accessibility and audio settings"
          className="w-11 h-11 rounded-full bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Settings className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
};
