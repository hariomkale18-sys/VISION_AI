import React, { useState } from 'react';
import { Mic, MicOff, Send, Sparkles, Volume2, Radio, CheckCircle2 } from 'lucide-react';
import { useVisionStore } from '../../stores/useVisionStore';

interface VoiceAssistantCardProps {
  onStartMic: () => void;
  onStopMic: () => void;
  onSimulateCommand: (text: string) => void;
}

export const VoiceAssistantCard: React.FC<VoiceAssistantCardProps> = ({
  onStartMic,
  onStopMic,
  onSimulateCommand,
}) => {
  const isListening = useVisionStore((s) => s.isListening);
  const isProcessingVoice = useVisionStore((s) => s.isProcessingVoice);
  const micLevel = useVisionStore((s) => s.micLevel);
  const lastTranscript = useVisionStore((s) => s.lastTranscript);
  const lastIntent = useVisionStore((s) => s.lastIntent);
  const lastResponse = useVisionStore((s) => s.lastResponse);
  const micStatusText = useVisionStore((s) => s.micStatusText);
  const highContrast = useVisionStore((s) => s.highContrast);

  const [typedCommand, setTypedCommand] = useState('');

  const handleSendTyped = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedCommand.trim()) {
      onSimulateCommand(typedCommand.trim());
      setTypedCommand('');
    }
  };

  const sampleVoiceCommands = [
    'Start detection',
    'Where am I',
    'Describe surroundings',
    'Navigate to Central Station',
    'Help',
  ];

  return (
    <div
      className={`rounded-[24px] p-6 shadow-sm border transition mb-6 ${
        highContrast
          ? 'bg-black text-white border-yellow-400 border-2'
          : 'bg-white border-slate-200/60'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-violet-400 flex items-center justify-center shadow-md">
            <Radio className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
              Always-On Gemini Voice Brain
            </h2>
            <p className="text-xs text-slate-500 font-medium">{micStatusText}</p>
          </div>
        </div>

        {/* Large Mic Toggle Button */}
        <button
          onClick={isListening ? onStopMic : onStartMic}
          aria-label={isListening ? 'Turn off always-on microphone' : 'Turn on always-on microphone'}
          className={`flex items-center gap-2 px-5 py-3 rounded-full text-xs sm:text-sm font-extrabold shadow-md transition min-h-[52px] focus:outline-none focus:ring-4 ${
            isListening
              ? 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-300'
              : 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-300'
          }`}
        >
          {isListening ? (
            <>
              <MicOff className="w-4 h-4" aria-hidden="true" />
              <span>Stop Mic</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 animate-bounce" aria-hidden="true" />
              <span>Start Listening</span>
            </>
          )}
        </button>
      </div>

      {/* Visual Live Waveform & Audio Meter Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 mb-4 shadow-inner">
        <div className="flex items-center justify-between mb-2 text-xs font-semibold text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
            <span>Voice Activity Detection (VAD)</span>
          </span>
          <span className="font-mono text-sky-400">Audio Level: {micLevel}%</span>
        </div>

        {/* Waveform Bars */}
        <div className="h-14 flex items-center justify-center gap-1.5 px-2">
          {Array.from({ length: 32 }).map((_, i) => {
            // Waveform animation height driven by micLevel and pseudo-variance
            const factor = Math.sin((i / 32) * Math.PI);
            const activeHeight = isListening
              ? Math.max(6, Math.min(52, (micLevel / 100) * 52 * factor + (i % 3) * 4))
              : 4;
            return (
              <span
                key={i}
                className={`w-1.5 rounded-full transition-all duration-75 ${
                  isListening
                    ? i % 4 === 0
                      ? 'bg-sky-400'
                      : i % 4 === 1
                      ? 'bg-blue-500'
                      : 'bg-violet-400'
                    : 'bg-slate-700'
                }`}
                style={{ height: `${activeHeight}px` }}
              />
            );
          })}
        </div>
      </div>

      {/* Live Transcript & Recognized Intent Display */}
      <div className="space-y-3 mb-4">
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Last Heard
            </span>
            {lastIntent && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-blue-600" aria-hidden="true" />
                <span>Intent: {lastIntent}</span>
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-900 leading-snug">
            "{lastTranscript}"
          </p>
        </div>

        <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1">
            <Volume2 className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
            <span>Spoken Assistant Response</span>
          </div>
          <p className="text-sm font-medium text-slate-800 leading-snug">
            {lastResponse}
          </p>
        </div>
      </div>

      {/* Quick Voice Command Chips */}
      <div className="mb-4">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Try Quick Voice Commands:
        </div>
        <div className="flex flex-wrap gap-2">
          {sampleVoiceCommands.map((cmd) => (
            <button
              key={cmd}
              onClick={() => onSimulateCommand(cmd)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 hover:bg-blue-100 hover:text-blue-800 text-slate-700 transition border border-slate-200/60 min-h-[36px]"
            >
              "{cmd}"
            </button>
          ))}
        </div>
      </div>

      {/* Simulated Typed Command Box */}
      <form onSubmit={handleSendTyped} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={typedCommand}
            onChange={(e) => setTypedCommand(e.target.value)}
            placeholder="Simulate voice command without mic (e.g. 'walk to pharmacy')..."
            aria-label="Type simulated voice command"
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>
        <button
          type="submit"
          aria-label="Submit simulated voice command"
          className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl px-5 py-3 text-sm font-bold flex items-center gap-1.5 transition shadow-sm min-h-[48px]"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
          <span>Execute</span>
        </button>
      </form>
    </div>
  );
};
