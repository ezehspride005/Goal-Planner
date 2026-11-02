import { ReminderSettings, ReminderType } from '../types/reminder';
import { GoalPlan } from '../types/goal';

export const REMINDERS_STORAGE_KEY = 'goal_planner_reminders_v1';

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: true,
  morningEnabled: true,
  morningTime: '08:00',
  eveningEnabled: true,
  eveningTime: '20:00',
  weeklyEnabled: true,
  weeklyDay: 0, // Sunday
  weeklyTime: '18:00',
  streakEnabled: true,
  rewardEnabled: true,
  quietHoursEnabled: true,
  quietStart: '21:00',
  quietEnd: '07:00',
  dailyNotificationCap: 3,
  promptDismissed: false,
  sentLogs: {},
  dailySentCount: {
    date: new Date().toISOString().split('T')[0],
    count: 0,
  },
};

/**
 * Check if the browser or platform supports Web Push / Notifications
 */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && ('Notification' in window || 'serviceWorker' in navigator);
}

/**
 * Detect if running on an iOS device (iPhone, iPod, iPad)
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Detect if app is currently running as a standalone PWA on Home Screen
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

/**
 * Check notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission;
}

/**
 * Request notification permission from browser
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (err) {
    console.warn('Failed to request notification permission:', err);
    return 'denied';
  }
}

/**
 * Get user's local timezone name (e.g. "America/New_York", "Europe/London")
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'Local Time';
  }
}

/**
 * Check if a time string "HH:MM" falls inside Quiet Hours
 * Handles wrap-around midnight (e.g., 21:00 to 07:00)
 */
export function isInsideQuietHours(
  quietStart: string,
  quietEnd: string,
  now: Date = new Date()
): boolean {
  const [startHour, startMinute] = (quietStart || '21:00').split(':').map(Number);
  const [endHour, endMinute] = (quietEnd || '07:00').split(':').map(Number);

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startHour * 60 + (startMinute || 0);
  const endMinutes = endHour * 60 + (endMinute || 0);

  if (startMinutes > endMinutes) {
    // Overnight: e.g. 21:00 (1260m) to 07:00 (420m)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } else {
    // Same day: e.g. 13:00 to 15:00
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
}

/**
 * Check if the daily notification cap (max 3/day) allows sending
 */
export function canSendNotificationToday(
  settings: ReminderSettings,
  todayStr: string = new Date().toISOString().split('T')[0]
): boolean {
  if (!settings.dailySentCount || settings.dailySentCount.date !== todayStr) {
    return true; // Fresh day, 0 sent
  }
  const cap = settings.dailyNotificationCap || 3;
  return settings.dailySentCount.count < cap;
}

/**
 * Record that a notification was sent today and update the daily cap counter
 */
export function recordNotificationSent(
  settings: ReminderSettings,
  typeKey: string,
  todayStr: string = new Date().toISOString().split('T')[0]
): ReminderSettings {
  const currentCount =
    settings.dailySentCount && settings.dailySentCount.date === todayStr
      ? settings.dailySentCount.count
      : 0;

  const updated: ReminderSettings = {
    ...settings,
    dailySentCount: {
      date: todayStr,
      count: currentCount + 1,
    },
    sentLogs: {
      ...(settings.sentLogs || {}),
      [typeKey]: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }

  return updated;
}

/**
 * Display a notification using the active ServiceWorkerRegistration or fallback to Notification API
 */
export async function showAppNotification(
  title: string,
  body: string,
  tab: 'daily' | 'weekly' = 'daily',
  tag: string = 'goal-planner-reminder'
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const options: NotificationOptions & { renotify?: boolean } = {
    body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag,
    renotify: true,
    data: {
      url: '/?tab=' + tab,
      tab,
    },
  };

  // Try via Service Worker registration first (standard for mobile PWA push)
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, options);
        return true;
      }
    }
  } catch (err) {
    console.warn('Service worker notification failed, falling back to window Notification:', err);
  }

  // Fallback to browser Notification object
  try {
    const notif = new Notification(title, options);
    notif.onclick = () => {
      window.focus();
      if (tab === 'weekly') {
        window.dispatchEvent(new CustomEvent('GOAL_PLANNER_NAV', { detail: 'weekly' }));
      } else {
        window.dispatchEvent(new CustomEvent('GOAL_PLANNER_NAV', { detail: 'daily' }));
      }
    };
    return true;
  } catch (err) {
    console.error('Failed to create Notification:', err);
    return false;
  }
}

/**
 * Send test reminder immediately with warm tone
 */
export async function sendTestReminder(
  type: ReminderType,
  userName: string = 'friend'
): Promise<{ success: boolean; message: string }> {
  const perm = getNotificationPermission();
  if (perm !== 'granted') {
    return {
      success: false,
      message: 'Please tap "Allow reminders" first so your browser permits notifications.',
    };
  }

  const name = userName ? userName : 'friend';
  let title = 'Goal Planner 🌸';
  let body = '';
  let tab: 'daily' | 'weekly' = 'daily';

  switch (type) {
    case 'morning':
      title = 'Morning Focus 🌸';
      body = `Good morning, ${name}. Here's today's plan with 3 tasks due. Take one gentle step at a time!`;
      tab = 'daily';
      break;
    case 'evening':
      title = 'Evening Check-in 🌿';
      body = `You have 2 tasks left today. Finish strong and earn your victory token!`;
      tab = 'daily';
      break;
    case 'weekly':
      title = 'Weekly Check-in 🌸';
      body = `Time for your weekly check-in! Take a moment to celebrate your wins and review your pace.`;
      tab = 'weekly';
      break;
    case 'streak':
      title = 'Protect Your Streak 🔥';
      body = `Keep your streak going! You still have time today to complete your list and earn your token.`;
      tab = 'daily';
      break;
    case 'reward':
      title = 'Victory Unlocked! 🌸';
      body = `All tasks completed today! You earned a victory token. Rest well and celebrate your consistency.`;
      tab = 'daily';
      break;
  }

  const success = await showAppNotification(title, body, tab, `test-${type}-${Date.now()}`);
  return {
    success,
    message: success
      ? `Test notification sent! Look for the banner on your device.`
      : 'Could not display notification. Please check your browser permissions.',
  };
}

/**
 * Trigger Reward Celebration Notification when all daily tasks are completed
 */
export async function triggerRewardCelebration(
  userName: string,
  tokensEarned: number,
  dayStreak: number,
  settings: ReminderSettings
): Promise<ReminderSettings | null> {
  if (!settings.enabled || !settings.rewardEnabled) return null;
  if (getNotificationPermission() !== 'granted') return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const typeKey = `reward_${todayStr}`;

  // Do not duplicate on same day
  if (settings.sentLogs?.[typeKey]) return null;

  // Check quiet hours
  if (settings.quietHoursEnabled && isInsideQuietHours(settings.quietStart, settings.quietEnd)) {
    return null;
  }

  // Check daily cap
  if (!canSendNotificationToday(settings, todayStr)) {
    return null;
  }

  const title = 'Victory Unlocked! 🌸';
  const body = `All tasks completed today! You earned a victory token (Total: ${tokensEarned + 1}). Day streak: ${dayStreak + 1} 🔥`;

  await showAppNotification(title, body, 'daily', typeKey);
  return recordNotificationSent(settings, typeKey, todayStr);
}

/**
 * Periodic reminder engine evaluated every 60s
 */
export async function evaluatePeriodicReminders(
  plan: GoalPlan | null,
  settings: ReminderSettings,
  userName: string
): Promise<ReminderSettings | null> {
  if (!settings.enabled || !plan) return null;
  if (getNotificationPermission() !== 'granted') return null;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Check quiet hours
  if (settings.quietHoursEnabled && isInsideQuietHours(settings.quietStart, settings.quietEnd, now)) {
    return null;
  }

  // Check max 3 daily cap
  if (!canSendNotificationToday(settings, todayStr)) {
    return null;
  }

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

  const name = userName || 'friend';
  const incompleteTasks = plan.dailyTasks.filter((t) => !t.completed);
  const tasksDue = incompleteTasks.length;

  // 1. Morning Reminder Check
  if (settings.morningEnabled) {
    const typeKey = `morning_${todayStr}`;
    if (!settings.sentLogs?.[typeKey]) {
      const [mH, mM] = (settings.morningTime || '08:00').split(':').map(Number);
      const targetMinutes = mH * 60 + (mM || 0);
      // Trigger if within 10 minutes of scheduled time
      if (Math.abs(currentTotalMinutes - targetMinutes) <= 10) {
        const title = 'Morning Focus 🌸';
        const body = `Good morning, ${name}. Here's today's plan with ${tasksDue} tasks due. Take one gentle step at a time!`;
        await showAppNotification(title, body, 'daily', typeKey);
        return recordNotificationSent(settings, typeKey, todayStr);
      }
    }
  }

  // 2. Evening Reminder Check (sent only if tasks are still unticked!)
  if (settings.eveningEnabled && tasksDue > 0) {
    const typeKey = `evening_${todayStr}`;
    if (!settings.sentLogs?.[typeKey]) {
      const [eH, eM] = (settings.eveningTime || '20:00').split(':').map(Number);
      const targetMinutes = eH * 60 + (eM || 0);
      if (Math.abs(currentTotalMinutes - targetMinutes) <= 10) {
        const title = 'Evening Reminder 🌿';
        const body = `You have ${tasksDue} task${tasksDue > 1 ? 's' : ''} left today. Finish strong and earn your victory token!`;
        await showAppNotification(title, body, 'daily', typeKey);
        return recordNotificationSent(settings, typeKey, todayStr);
      }
    }
  }

  // 3. Weekly Check-In Reminder Check
  if (settings.weeklyEnabled && currentDayOfWeek === (settings.weeklyDay ?? 0)) {
    const typeKey = `weekly_${todayStr}`;
    if (!settings.sentLogs?.[typeKey]) {
      const [wH, wM] = (settings.weeklyTime || '18:00').split(':').map(Number);
      const targetMinutes = wH * 60 + (wM || 0);
      if (Math.abs(currentTotalMinutes - targetMinutes) <= 10) {
        const title = 'Weekly Check-in 🌸';
        const body = `Time for your weekly check-in! Take a brief moment to celebrate your wins and review your pace.`;
        await showAppNotification(title, body, 'weekly', typeKey);
        return recordNotificationSent(settings, typeKey, todayStr);
      }
    }
  }

  // 4. Streak Reminder Check (nudge when streak is about to break)
  if (settings.streakEnabled && (plan.dayStreak || 0) > 0 && tasksDue > 0) {
    const typeKey = `streak_${todayStr}`;
    if (!settings.sentLogs?.[typeKey]) {
      // Send nudge in evening between 19:00 and 21:00 if incomplete
      if (currentHour >= 19 && currentHour < 21) {
        const title = 'Protect Your Streak 🔥';
        const body = `Keep your ${plan.dayStreak}-day streak alive! Complete today's checklist before midnight.`;
        await showAppNotification(title, body, 'daily', typeKey);
        return recordNotificationSent(settings, typeKey, todayStr);
      }
    }
  }

  return null;
}
