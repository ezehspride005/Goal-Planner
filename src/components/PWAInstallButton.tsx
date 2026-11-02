import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Hide button if already installed and running standalone
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {isInstallable && (
        <button
          onClick={install}
          aria-label="Install Goal Planner App"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#A9C2A5] hover:bg-[#97b393] text-[#3F5A44] transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-[#3F5A44]" />
          <span>Add to Home Screen</span>
        </button>
      )}

      {isIOS && !isInstallable && (
        <button
          onClick={() => setShowIOSGuide(true)}
          aria-label="Install instructions for iOS Safari"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border border-[#3F5A44]/20 text-[#3F5A44] hover:bg-[#F8DDE3]/40 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-[#3F5A44]" />
          <span>Install on iPhone</span>
        </button>
      )}

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#FFFAF7] p-6 shadow-2xl border border-[#F8DDE3] relative text-[#4A3038]">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-[#3F5A44]/60 hover:text-[#3F5A44] hover:bg-[#F8DDE3]/40"
              aria-label="Close installation instructions"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F8DDE3] flex items-center justify-center">
                <span className="text-xl">🌸</span>
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-[#3F5A44]">Install Goal Planner</h3>
                <p className="text-xs text-[#4A3038]/70">Add to iPhone Home Screen</p>
              </div>
            </div>

            <p className="text-sm text-[#4A3038]/85 mb-4 leading-relaxed">
              Install Goal Planner for instant offline access and full-screen experience:
            </p>

            <div className="space-y-3 bg-[#F8DDE3]/30 p-4 rounded-2xl border border-[#F8DDE3]/60 mb-5">
              <div className="flex items-start gap-3 text-sm">
                <div className="p-1.5 rounded-xl bg-white text-[#3F5A44] shadow-xs">
                  <Share2 className="w-4 h-4" />
                </div>
                <span>1. Tap the <strong>Share</strong> button in Safari's bottom toolbar.</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="p-1.5 rounded-xl bg-white text-[#3F5A44] shadow-xs">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <span>2. Scroll down and select <strong>Add to Home Screen</strong>.</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <div className="p-1.5 rounded-xl bg-[#A9C2A5] text-[#3F5A44] shadow-xs">
                  ✓
                </div>
                <span>3. Tap <strong>Add</strong> at the top right to start planning!</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-3 rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] text-[#3F5A44] font-semibold text-sm transition-all shadow-sm active:scale-98 cursor-pointer"
            >
              Got it, let's achieve my goal
            </button>
          </div>
        </div>
      )}
    </>
  );
};
