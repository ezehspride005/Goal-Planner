import React, { useState } from 'react';
import {
  Bell,
  Sparkles,
  Share,
  PlusSquare,
  CheckCircle2,
  Moon,
  Clock,
  ShieldCheck,
  X,
  Smartphone,
} from 'lucide-react';
import {
  isIOS,
  isStandalonePWA,
  requestNotificationPermission,
} from '../../utils/notifications';

interface ReminderPermissionModalProps {
  isOpen: boolean;
  userName?: string;
  onAllow: () => Promise<void>;
  onDismiss: () => void;
}

export const ReminderPermissionModal: React.FC<ReminderPermissionModalProps> = ({
  isOpen,
  userName,
  onAllow,
  onDismiss,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(isIOS() && !isStandalonePWA());

  if (!isOpen) return null;

  const handleAllowClick = async () => {
    setIsRequesting(true);
    try {
      const perm = await requestNotificationPermission();
      if (perm === 'granted') {
        await onAllow();
      } else {
        onDismiss();
      }
    } catch (e) {
      console.error(e);
      onDismiss();
    } finally {
      setIsRequesting(false);
    }
  };

  const displayName = userName || 'there';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl bg-[#FFFAF7] p-6 shadow-2xl border border-[#F8DDE3] text-[#4A3038] relative my-6">
        {/* Close / Dismiss */}
        <button
          onClick={onDismiss}
          className="absolute top-5 right-5 p-2 rounded-xl text-[#3F5A44]/70 hover:text-[#3F5A44] hover:bg-[#F8DDE3]/50 transition cursor-pointer"
          aria-label="Dismiss reminders modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-[#F8DDE3] flex items-center justify-center text-[#3F5A44] shadow-xs">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#3F5A44]/80">
              Gentle Reminders
            </span>
            <h2 className="font-serif text-xl font-bold text-[#3F5A44] leading-tight">
              Stay in Flow, {displayName}
            </h2>
          </div>
        </div>

        {/* iOS Home Screen Notice if needed */}
        {showIOSGuide ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#F8DDE3]/40 border border-[#F8DDE3] text-left">
              <div className="flex items-center gap-2 mb-2 text-[#3F5A44] font-bold text-xs sm:text-sm">
                <Smartphone className="w-4 h-4 text-[#3F5A44]" />
                <span>iPhone Notification Setup</span>
              </div>
              <p className="text-xs text-[#4A3038]/80 leading-relaxed mb-3">
                iOS requires web apps to be added to your Home Screen before push notifications can be delivered. It takes 10 seconds:
              </p>
              <ol className="text-xs space-y-2 text-[#4A3038]/85 pl-1">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#A9C2A5] text-[#3F5A44] font-bold text-[11px] flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>
                    Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline text-[#3F5A44]" /> at the bottom of Safari
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#A9C2A5] text-[#3F5A44] font-bold text-[11px] flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>
                    Scroll and tap <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline text-[#3F5A44]" />
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#A9C2A5] text-[#3F5A44] font-bold text-[11px] flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span>
                    Launch <strong>Goal Planner</strong> from your Home Screen & tap Allow
                  </span>
                </li>
              </ol>
            </div>

            <p className="text-[11px] text-[#4A3038]/60 text-center">
              Already running from your Home Screen? Tap Continue below.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] text-[#3F5A44] font-bold text-sm shadow-xs transition cursor-pointer active:scale-98 flex items-center justify-center gap-2"
              >
                <span>Continue to Enable Reminders</span>
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="py-2.5 text-xs text-[#4A3038]/70 hover:text-[#3F5A44] cursor-pointer"
              >
                Maybe later in settings
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-[#4A3038]/80 leading-relaxed">
              Reaching your yearly goal happens one day at a time. Gentle daily reminders help you stay on track without stress.
            </p>

            {/* Benefit cards */}
            <div className="space-y-2.5">
              <div className="p-3 rounded-2xl bg-white border border-[#F8DDE3] flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-[#CFDDC9]/70 text-[#3F5A44] flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#3F5A44]">
                    Morning Plan & Evening Check-in
                  </h4>
                  <p className="text-[11px] text-[#4A3038]/70 leading-snug">
                    A friendly morning note with today's tasks, and an evening nudge only if tasks are still left.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white border border-[#F8DDE3] flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-[#CFDDC9]/70 text-[#3F5A44] flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#3F5A44]">
                    Streak Reminders & Celebrations
                  </h4>
                  <p className="text-[11px] text-[#4A3038]/70 leading-snug">
                    Get a cheerful note when you finish all tasks and earn a token, plus a nudge if a streak is about to break.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white border border-[#F8DDE3] flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-[#CFDDC9]/70 text-[#3F5A44] flex items-center justify-center shrink-0 mt-0.5">
                  <Moon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#3F5A44]">
                    Quiet Hours & At Most 3 Per Day
                  </h4>
                  <p className="text-[11px] text-[#4A3038]/70 leading-snug">
                    No notifications during your sleep hours (default 9 PM to 7 AM), and a maximum of 3 a day.
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                disabled={isRequesting}
                onClick={handleAllowClick}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#A9C2A5] hover:bg-[#97b393] text-[#3F5A44] font-bold text-sm shadow-xs transition cursor-pointer active:scale-98 flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4" />
                <span>{isRequesting ? 'Requesting permission...' : 'Allow Reminders'}</span>
              </button>

              <button
                type="button"
                onClick={onDismiss}
                className="py-2.5 text-xs text-[#4A3038]/70 hover:text-[#3F5A44] cursor-pointer"
              >
                Maybe later (you can turn them on anytime in Settings)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
