import React, { useState } from 'react';
import {
  Settings,
  X,
  Volume2,
  Sliders,
  Type,
  Eye,
  ShieldCheck,
  UserCheck,
  Check,
} from 'lucide-react';
import { useVisionStore } from '../../stores/useVisionStore';
import { useStatsStore } from '../../store/statsStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  speak: (text: string, isUrgent?: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, speak }) => {
  const highContrast = useVisionStore((s) => s.highContrast);
  const setHighContrast = useVisionStore((s) => s.setHighContrast);
  const largeText = useVisionStore((s) => s.largeText);
  const setLargeText = useVisionStore((s) => s.setLargeText);
  const speechRate = useVisionStore((s) => s.speechRate);
  const setSpeechRate = useVisionStore((s) => s.setSpeechRate);
  const speechVolume = useVisionStore((s) => s.speechVolume);
  const setSpeechVolume = useVisionStore((s) => s.setSpeechVolume);
  const preferredLanguage = useVisionStore((s) => s.preferredLanguage);
  const setPreferredLanguage = useVisionStore((s) => s.setPreferredLanguage);
  const emergencyContact = useVisionStore((s) => s.emergencyContact);
  const setEmergencyContact = useVisionStore((s) => s.setEmergencyContact);

  const [contactName, setContactName] = useState(emergencyContact.name);
  const [contactPhone, setContactPhone] = useState(emergencyContact.phone);
  const [contactRelation, setContactRelation] = useState(emergencyContact.relationship);

  if (!isOpen) return null;

  const handleSaveContact = () => {
    setEmergencyContact({
      name: contactName,
      phone: contactPhone,
      relationship: contactRelation,
    });
    speak('Emergency contact saved');
  };

  const handleTestVoice = () => {
    speak('This is a test of VISION AI speech feedback with your selected rate and volume.');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
    >
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-100 text-slate-900">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
              <Settings className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-xl font-extrabold tracking-tight">
                Accessibility & Audio Settings
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Customize high-contrast display, voice speed, and emergency contacts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 my-6">
          {/* Visual Accessibility Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Visual Accessibility
            </h3>

            {/* High Contrast Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black text-yellow-400 flex items-center justify-center font-bold">
                  <Eye className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">High-Contrast Mode</div>
                  <div className="text-xs text-slate-500">WCAG AAA black and yellow palette</div>
                </div>
              </div>
              <button
                role="switch"
                aria-checked={highContrast}
                onClick={() => {
                  const val = !highContrast;
                  setHighContrast(val);
                  speak(val ? 'High contrast mode enabled' : 'High contrast mode disabled');
                }}
                className={`w-14 h-8 rounded-full p-1 transition-colors ${
                  highContrast ? 'bg-yellow-400' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                    highContrast ? 'translate-x-6 bg-black' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Large Text Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Type className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Large-Text Mode</div>
                  <div className="text-xs text-slate-500">Enlarge fonts up to 135% for low vision</div>
                </div>
              </div>
              <button
                role="switch"
                aria-checked={largeText}
                onClick={() => {
                  const val = !largeText;
                  setLargeText(val);
                  speak(val ? 'Large text enabled' : 'Large text disabled');
                }}
                className={`w-14 h-8 rounded-full p-1 transition-colors ${
                  largeText ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                    largeText ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Voice & Speech Tuning */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Speech Synthesis Configuration
            </h3>

            {/* Speech Language */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Spoken Language & Dialect
              </label>
              <select
                value={preferredLanguage}
                onChange={(e) => {
                  setPreferredLanguage(e.target.value);
                  speak(`Language set to ${e.target.options[e.target.selectedIndex].text}`);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900"
              >
                <option value="en-US">English (United States)</option>
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">Hindi (हिंदी - India)</option>
                <option value="mr-IN">Marathi (मराठी - Maharashtra)</option>
              </select>
            </div>

            {/* Speech Rate Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Speech Rate: {speechRate.toFixed(2)}x</span>
                <span className="text-slate-400 font-normal">0.7x (Slower) — 1.5x (Faster)</span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.05"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Speech Volume Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Speech Volume: {Math.round(speechVolume * 100)}%</span>
                <span className="text-slate-400 font-normal">10% — 100%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={speechVolume}
                onChange={(e) => setSpeechVolume(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <button
              onClick={handleTestVoice}
              className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition flex items-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Test Voice Output</span>
            </button>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Emergency Contact Setup
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Full Name"
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
              />
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Phone Number"
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
              />
              <input
                type="text"
                value={contactRelation}
                onChange={(e) => setContactRelation(e.target.value)}
                placeholder="Relationship"
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold"
              />
            </div>

            <button
              onClick={handleSaveContact}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
            >
              Save Contact
            </button>
          </div>

          {/* Daily Stats Reset Section */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Daily Metrics & History
            </h3>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 border border-rose-100">
              <div>
                <div className="text-sm font-bold text-rose-950">Reset Today's Statistics</div>
                <div className="text-xs text-rose-700">
                  Resets today's detected objects, walking distance, and voice command counters to zero.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  useStatsStore.getState().resetTodayStats();
                  speak("Today's statistics have been reset.");
                }}
                className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs shrink-0"
              >
                Reset Today's Stats
              </button>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed font-medium">
          <strong className="block mb-0.5 font-bold">Important Safety Notice:</strong>
          VISION_AI is an assistive tool and does not replace a white cane or guide dog.
          Always maintain vigilance and tactile environmental awareness while navigating outdoors.
        </div>
      </div>
    </div>
  );
};
