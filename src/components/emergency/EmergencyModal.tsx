import React, { useState } from 'react';
import { ShieldAlert, Phone, Share2, Copy, Check, X, AlertTriangle } from 'lucide-react';
import { useVisionStore } from '../../stores/useVisionStore';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  speak: (text: string, isUrgent?: boolean) => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ isOpen, onClose, speak }) => {
  const userLocation = useVisionStore((s) => s.userLocation);
  const userAddress = useVisionStore((s) => s.userAddress);
  const emergencyContact = useVisionStore((s) => s.emergencyContact);
  const setEmergencyContact = useVisionStore((s) => s.setEmergencyContact);
  const addRecentActivity = useVisionStore((s) => s.addRecentActivity);

  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [contactName, setContactName] = useState(emergencyContact.name);
  const [contactPhone, setContactPhone] = useState(emergencyContact.phone);

  if (!isOpen) return null;

  const lat = userLocation ? userLocation[0] : 40.7128;
  const lng = userLocation ? userLocation[1] : -74.006;
  const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
  const shareText = `EMERGENCY ALERT from VISION_AI: I need urgent assistance.\nMy current location: ${userAddress}\nCoordinates: ${lat.toFixed(
    5
  )}, ${lng.toFixed(5)}\nMap Link: ${mapsLink}`;

  const handleTriggerSOS = async () => {
    speak('Sending your location to emergency contact', true);

    addRecentActivity({
      action: 'Emergency SOS Broadcast',
      details: `Live GPS shared to ${emergencyContact.name} (${emergencyContact.phone})`,
      status: 'Completed',
      iconType: 'emergency',
    });

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'VISION_AI Emergency Alert',
          text: shareText,
          url: mapsLink,
        });
        return;
      } catch (e) {
        console.debug('Web share dismissed or failed:', e);
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      speak('Location copied to clipboard');
    } catch {
      speak('Please send your location link to emergency contact');
    }
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    setEmergencyContact({ name: contactName, phone: contactPhone });
    setEditing(false);
    speak('Emergency contact updated');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
    >
      <div className="w-full max-w-lg bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl border border-rose-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/30">
              <ShieldAlert className="w-6 h-6 animate-pulse" aria-hidden="true" />
            </div>
            <div>
              <h2 id="emergency-modal-title" className="text-xl font-extrabold text-slate-900 tracking-tight">
                Emergency SOS Beacon
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Broadcast live GPS coordinates to your trusted contact
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close emergency beacon"
            className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SOS Giant Button */}
        <div className="my-6">
          <button
            onClick={handleTriggerSOS}
            aria-label="Broadcast Emergency SOS: Send live coordinates to contact"
            className="w-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white py-6 rounded-2xl flex flex-col items-center justify-center shadow-xl shadow-rose-600/30 transition focus:outline-none focus:ring-4 focus:ring-rose-300 min-h-[96px]"
          >
            <div className="flex items-center gap-2 text-2xl font-black tracking-wider uppercase">
              <AlertTriangle className="w-7 h-7" aria-hidden="true" />
              <span>Broadcast SOS Now</span>
            </div>
            <span className="text-xs text-rose-100 font-semibold mt-1">
              Shares live location link with {emergencyContact.name} ({emergencyContact.phone})
            </span>
          </button>
        </div>

        {/* Location & Contact Summary */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3 mb-6">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Current Address
            </div>
            <div className="text-sm font-bold text-slate-900 leading-snug">{userAddress}</div>
            <div className="text-xs font-mono text-slate-500 mt-0.5">
              Lat: {lat.toFixed(5)}, Lng: {lng.toFixed(5)}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Emergency Contact
              </div>
              <button
                onClick={() => setEditing(!editing)}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                {editing ? 'Cancel' : 'Edit Contact'}
              </button>
            </div>

            {editing ? (
              <form onSubmit={handleSaveContact} className="mt-2 space-y-2">
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Contact Name"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900"
                />
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Phone Number"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900"
                />
                <button
                  type="submit"
                  className="w-full bg-slate-900 text-white font-bold py-2 rounded-xl text-xs"
                >
                  Save Contact
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between mt-1 text-sm font-bold text-slate-900">
                <span>{emergencyContact.name} ({emergencyContact.relationship})</span>
                <span className="font-mono text-blue-600">{emergencyContact.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={`tel:${emergencyContact.phone}`}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-2xl text-xs sm:text-sm font-bold transition min-h-[48px]"
          >
            <Phone className="w-4 h-4" aria-hidden="true" />
            <span>Call Contact</span>
          </a>

          <button
            onClick={handleTriggerSOS}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-2xl text-xs sm:text-sm font-bold transition min-h-[48px]"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" aria-hidden="true" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
