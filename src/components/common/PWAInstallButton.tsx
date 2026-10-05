import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        aria-label="Install VISION_AI app to device home screen"
        className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition focus:outline-none focus:ring-4 focus:ring-blue-400 min-h-[48px]"
      >
        <Download className="w-4 h-4" aria-hidden="true" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          aria-label="How to install VISION_AI on iOS"
          className="flex items-center gap-1.5 rounded-full border border-slate-300 dark:border-slate-700 bg-white/80 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-white transition min-h-[44px]"
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          >
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-slate-900 border border-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 id="ios-install-title" className="text-base font-bold text-slate-900">
                  Install VISION_AI on iOS
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-full p-2 text-slate-400 hover:text-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close installation guide"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p>
                  1. Tap the <strong className="text-slate-900">Share</strong> icon at the bottom of Safari.
                </p>
                <p>
                  2. Scroll down and tap{' '}
                  <strong className="text-slate-900">Add to Home Screen</strong>.
                </p>
                <p>3. Tap Add to launch full-screen with offline neural detection.</p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
