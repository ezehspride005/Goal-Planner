import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

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

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-50 flex items-center gap-2.5 p-3 rounded-2xl bg-[#4A3038] text-[#FFFAF7] shadow-xl border border-white/10 animate-fade-in text-xs">
      <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
      <div className="flex-1">
        <p className="font-semibold">Offline Mode</p>
        <p className="text-[11px] text-white/80">Cached data is active. Your progress is saved locally.</p>
      </div>
      <WifiOff className="w-4 h-4 text-white/60 shrink-0" />
    </div>
  );
};
