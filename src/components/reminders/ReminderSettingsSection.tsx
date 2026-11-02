import React, { useState } from 'react';
import { ReminderSettings, ReminderType } from '../../types/reminder';
import {
  Bell,
  Clock,
  Moon,
  Sparkles,
  Award,
  Flame,
  CalendarCheck,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Shield,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import {
  getUserTimezone,
  getNotificationPermission,
  requestNotificationPermission,
  sendTestReminder,
  isIOS,
  isStandalonePWA,
} from '../../utils/notifications';

interface ReminderSettingsSectionProps {
  settings: ReminderSettings;
  onUpdateSettings: (newSettings: ReminderSettings) => void;
  userName?: string;
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const ReminderSettingsSection: React.FC<ReminderSettingsSectionProps> = ({
  settings,
  onUpdateSettings,
  userName = 'friend',
}) => {
  const [testStatus, setTestStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [testingType, setTestingType] = useState<ReminderType>('morning');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showFCMGuide, setShowFCMGuide] = useState(false);

  const permission = getNotificationPermission();
  const timezone = getUserTimezone();
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount =
    settings.dailySentCount?.date === todayStr ? settings.dailySentCount.count : 0;

  const handleToggle = (key: keyof ReminderSettings) => {
    const updated = {
      ...settings,
      [key]: !settings[key],
      updatedAt: new Date().toISOString(),
    };
    onUpdateSettings(updated);
  };

  const handleValueChange = (key: keyof ReminderSettings, value: any) => {
    const updated = {
      ...settings,
      [key]: value,
      updatedAt: new Date().toISOString(),
    };
    onUpdateSettings(updated);
  };

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    if (res === 'granted') {
      const updated = {
        ...settings,
        enabled: true,
        updatedAt: new Date().toISOString(),
      };
      onUpdateSettings(updated);
      setTestStatus({
        message: 'Notification permission granted! 🌸',
        type: 'success',
      });
    } else {
      setTestStatus({
        message: 'Permission was declined. You can enable it in your browser site settings.',
        type: 'error',
      });
    }
  };

  const handleSendTest = async (type: ReminderType) => {
    setIsSendingTest(true);
    setTestStatus(null);
    try {
      const res = await sendTestReminder(type, userName);
      setTestStatus({
        message: res.message,
        type: res.success ? 'success' : 'error',
      });
    } catch (err: any) {
      setTestStatus({
        message: err.message || 'Failed to send test notification.',
        type: 'error',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="p-4 rounded-2xl bg-white/80 border border-[#F8DDE3] shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#F8DDE3] text-[#3F5A44] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-[#3F5A44]">
                Reminders & Notifications
              </h3>
              <p className="text-[11px] text-[#4A3038]/60">
                Helpful daily alerts on your phone or computer
              </p>
            </div>
          </div>

          {/* Master Enable/Disable Switch */}
          <button
            type="button"
            onClick={() => handleToggle('enabled')}
            aria-label="Toggle all reminders"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              settings.enabled ? 'bg-[#A9C2A5]' : 'bg-[#E5D7D7]'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Permission status badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F8DDE3]/60 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[#4A3038]/70">Browser Status:</span>
            {permission === 'granted' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#3F5A44] bg-[#CFDDC9]/70 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3 text-[#3F5A44]" />
                Allowed
              </span>
            ) : permission === 'denied' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                Blocked in browser
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRequestPermission}
                className="text-[11px] font-bold text-[#3F5A44] bg-[#A9C2A5]/70 hover:bg-[#A9C2A5] px-2 py-0.5 rounded-full cursor-pointer transition"
              >
                Tap to Allow Reminders
              </button>
            )}
          </div>

          <span className="text-[10px] text-[#4A3038]/60">
            Timezone: <strong className="text-[#3F5A44]">{timezone}</strong>
          </span>
        </div>

        {/* iOS Reminder Note if mobile */}
        {isIOS() && !isStandalonePWA() && (
          <div className="mt-3 p-2.5 rounded-xl bg-[#F8DDE3]/50 border border-[#F8DDE3] text-[11px] text-[#4A3038] flex items-start gap-2">
            <Smartphone className="w-4 h-4 text-[#3F5A44] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#3F5A44] block">iPhone Tip:</strong>
              Add Goal Planner to your Home Screen from Safari (Share &gt; Add to Home Screen) to receive alerts when the app is closed.
            </div>
          </div>
        )}
      </div>

      {settings.enabled && (
        <>
          {/* Daily Rules Banner (Max 3/day & Warm Tone) */}
          <div className="p-3 rounded-2xl bg-[#CFDDC9]/40 border border-[#A9C2A5]/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#3F5A44]" />
              <div>
                <span className="font-bold text-[#3F5A44]">Gentle Reminders Rule:</span>
                <span className="text-[#4A3038]/80 block text-[11px]">
                  At most 3 reminders per day. Warm and encouraging, never guilt-tripping.
                </span>
              </div>
            </div>
            <span className="px-2 py-1 bg-white/80 rounded-xl text-[10px] font-bold text-[#3F5A44] shrink-0">
              {todayCount}/3 sent today
            </span>
          </div>

          {/* Reminder Types Checklist */}
          <div className="p-4 rounded-2xl bg-white/80 border border-[#F8DDE3] shadow-xs space-y-4">
            <h4 className="font-serif text-xs font-bold text-[#3F5A44] uppercase tracking-wider">
              Reminder Schedule & Types
            </h4>

            {/* 1. Morning Reminder */}
            <div className="p-3 rounded-xl bg-[#FFFAF7] border border-[#F8DDE3] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#3F5A44]" />
                  <div>
                    <span className="text-xs font-bold text-[#3F5A44] block">
                      1. Morning Daily Plan
                    </span>
                    <span className="text-[11px] text-[#4A3038]/70">
                      "Good morning, {userName}. Here's today's plan with tasks due."
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.morningEnabled}
                  onChange={() => handleToggle('morningEnabled')}
                  className="w-4 h-4 accent-[#A9C2A5] cursor-pointer"
                />
              </div>
              {settings.morningEnabled && (
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[11px] text-[#4A3038]/70">Time:</span>
                  <input
                    type="time"
                    value={settings.morningTime || '08:00'}
                    onChange={(e) => handleValueChange('morningTime', e.target.value)}
                    className="px-2 py-1 rounded-xl border border-[#A9C2A5] bg-white text-xs font-semibold text-[#3F5A44]"
                  />
                </div>
              )}
            </div>

            {/* 2. Evening Reminder */}
            <div className="p-3 rounded-xl bg-[#FFFAF7] border border-[#F8DDE3] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-[#3F5A44]" />
                  <div>
                    <span className="text-xs font-bold text-[#3F5A44] block">
                      2. Evening Check-in
                    </span>
                    <span className="text-[11px] text-[#4A3038]/70">
                      Sent only if tasks are still left: "Finish strong and earn your token."
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.eveningEnabled}
                  onChange={() => handleToggle('eveningEnabled')}
                  className="w-4 h-4 accent-[#A9C2A5] cursor-pointer"
                />
              </div>
              {settings.eveningEnabled && (
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-[11px] text-[#4A3038]/70">Time:</span>
                  <input
                    type="time"
                    value={settings.eveningTime || '20:00'}
                    onChange={(e) => handleValueChange('eveningTime', e.target.value)}
                    className="px-2 py-1 rounded-xl border border-[#A9C2A5] bg-white text-xs font-semibold text-[#3F5A44]"
                  />
                </div>
              )}
            </div>

            {/* 3. Weekly Check-In Reminder */}
            <div className="p-3 rounded-xl bg-[#FFFAF7] border border-[#F8DDE3] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="w-4 h-4 text-[#3F5A44]" />
                  <div>
                    <span className="text-xs font-bold text-[#3F5A44] block">
                      3. Weekly Check-in Reminder
                    </span>
                    <span className="text-[11px] text-[#4A3038]/70">
                      Once a week at the day and time you pick.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.weeklyEnabled}
                  onChange={() => handleToggle('weeklyEnabled')}
                  className="w-4 h-4 accent-[#A9C2A5] cursor-pointer"
                />
              </div>
              {settings.weeklyEnabled && (
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div>
                    <label className="text-[10px] text-[#4A3038]/70 block mb-1">
                      Day of week:
                    </label>
                    <select
                      value={settings.weeklyDay ?? 0}
                      onChange={(e) => handleValueChange('weeklyDay', Number(e.target.value))}
                      className="w-full px-2 py-1 rounded-xl border border-[#A9C2A5] bg-white text-xs font-semibold text-[#3F5A44]"
                    >
                      {DAYS_OF_WEEK.map((day, idx) => (
                        <option key={day} value={idx}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#4A3038]/70 block mb-1">
                      Time:
                    </label>
                    <input
                      type="time"
                      value={settings.weeklyTime || '18:00'}
                      onChange={(e) => handleValueChange('weeklyTime', e.target.value)}
                      className="w-full px-2 py-1 rounded-xl border border-[#A9C2A5] bg-white text-xs font-semibold text-[#3F5A44]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 4. Streak Reminder */}
            <div className="p-3 rounded-xl bg-[#FFFAF7] border border-[#F8DDE3] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-600" />
                <div>
                  <span className="text-xs font-bold text-[#3F5A44] block">
                    4. Streak Reminder
                  </span>
                  <span className="text-[11px] text-[#4A3038]/70">
                    A gentle heads-up when your daily streak is about to break.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.streakEnabled}
                onChange={() => handleToggle('streakEnabled')}
                className="w-4 h-4 accent-[#A9C2A5] cursor-pointer"
              />
            </div>

            {/* 5. Reward Celebration Notification */}
            <div className="p-3 rounded-xl bg-[#FFFAF7] border border-[#F8DDE3] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#3F5A44]" />
                <div>
                  <span className="text-xs font-bold text-[#3F5A44] block">
                    5. Reward Celebration
                  </span>
                  <span className="text-[11px] text-[#4A3038]/70">
                    A cheerful note when all tasks are checked and you earn a token.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.rewardEnabled}
                onChange={() => handleToggle('rewardEnabled')}
                className="w-4 h-4 accent-[#A9C2A5] cursor-pointer"
              />
            </div>
          </div>

          {/* Quiet Hours Settings */}
          <div className="p-4 rounded-2xl bg-white/80 border border-[#F8DDE3] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-[#3F5A44]" />
                <div>
                  <span className="text-xs font-bold text-[#3F5A44] block">
                    Quiet Hours
                  </span>
                  <span className="text-[11px] text-[#4A3038]/70">
                    No sound or notifications will be sent during these hours.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.quietHoursEnabled}
                onChange={() => handleToggle('quietHoursEnabled')}
                className="w-4 h-4 accent-[#A9C2A5] cursor-pointer"
              />
            </div>

            {settings.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div>
                  <label className="text-[10px] text-[#4A3038]/70 block mb-1">
                    Quiet Starts (Night):
                  </label>
                  <input
                    type="time"
                    value={settings.quietStart || '21:00'}
                    onChange={(e) => handleValueChange('quietStart', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[#A9C2A5] bg-[#FFFAF7] text-xs font-semibold text-[#3F5A44]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#4A3038]/70 block mb-1">
                    Quiet Ends (Morning):
                  </label>
                  <input
                    type="time"
                    value={settings.quietEnd || '07:00'}
                    onChange={(e) => handleValueChange('quietEnd', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-[#A9C2A5] bg-[#FFFAF7] text-xs font-semibold text-[#3F5A44]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Send Test Reminder Box */}
          <div className="p-4 rounded-2xl bg-[#F8DDE3]/40 border border-[#F8DDE3] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-[#3F5A44]" />
                <span className="text-xs font-bold text-[#3F5A44]">
                  Test Live Notification
                </span>
              </div>
              <span className="text-[10px] text-[#4A3038]/60">
                Instant preview
              </span>
            </div>

            <p className="text-[11px] text-[#4A3038]/80 leading-relaxed">
              Verify how your device and browser display each of the 5 gentle reminder styles:
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={testingType}
                onChange={(e) => setTestingType(e.target.value as ReminderType)}
                className="flex-1 min-w-[140px] px-3 py-2 rounded-xl border border-[#A9C2A5] bg-white text-xs font-semibold text-[#3F5A44]"
              >
                <option value="morning">Morning Daily Plan</option>
                <option value="evening">Evening Unticked Reminder</option>
                <option value="weekly">Weekly Check-in Nudge</option>
                <option value="streak">Streak Protection Nudge</option>
                <option value="reward">Victory Token Celebration</option>
              </select>

              <button
                type="button"
                disabled={isSendingTest}
                onClick={() => handleSendTest(testingType)}
                className="px-4 py-2 rounded-xl bg-[#A9C2A5] hover:bg-[#97b393] text-[#3F5A44] font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5 active:scale-98"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingTest ? 'Sending...' : 'Send Test'}</span>
              </button>
            </div>

            {testStatus && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                  testStatus.type === 'success'
                    ? 'bg-[#CFDDC9]/70 text-[#3F5A44] border border-[#A9C2A5]'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {testStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#3F5A44] shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{testStatus.message}</span>
              </div>
            )}
          </div>

          {/* Firebase Cloud Messaging Setup Guide */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowFCMGuide(!showFCMGuide)}
              className="w-full p-3 rounded-2xl bg-white border border-[#F8DDE3] hover:bg-[#F8DDE3]/30 transition text-left flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#3F5A44]" />
                <span className="text-xs font-semibold text-[#3F5A44]">
                  Firebase Cloud Messaging (FCM) Setup Walkthrough
                </span>
              </div>
              <ChevronRight
                className={`w-4 h-4 text-[#4A3038]/60 transition-transform ${
                  showFCMGuide ? 'rotate-90' : ''
                }`}
              />
            </button>

            {showFCMGuide && (
              <div className="mt-2 p-4 rounded-2xl bg-white border border-[#F8DDE3] text-xs space-y-3 animate-fade-in">
                <h5 className="font-serif font-bold text-sm text-[#3F5A44]">
                  Setting up Firebase Cloud Messaging (FCM) for Web Push
                </h5>
                <p className="text-[11px] text-[#4A3038]/80 leading-relaxed">
                  The app is fully equipped with Service Worker push handlers (<code>/sw.js</code> and <code>/firebase-messaging-sw.js</code>). To enable server-to-client background push tokens in Firebase Console:
                </p>

                <ol className="space-y-2 text-[11px] list-decimal pl-4 text-[#4A3038]/90">
                  <li>
                    Go to the <strong>Firebase Console</strong> &gt; select your project (<code>summer-hydra-dfx4d</code>).
                  </li>
                  <li>
                    Click the <strong>Settings gear ⚙️</strong> &gt; <strong>Project settings</strong> &gt; <strong>Cloud Messaging</strong> tab.
                  </li>
                  <li>
                    Under <strong>Web configuration</strong> &gt; <strong>Web Push certificates</strong>, click <strong>Generate key pair</strong>. This creates your VAPID key.
                  </li>
                  <li>
                    On iOS Safari, push notifications work seamlessly once the user taps <strong>Add to Home Screen</strong>.
                  </li>
                  <li>
                    The app automatically handles daily reminder scheduling in the background and respects your quiet hours and timezone.
                  </li>
                </ol>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
