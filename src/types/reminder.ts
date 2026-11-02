export interface ReminderSettings {
  enabled: boolean;
  morningEnabled: boolean;
  morningTime: string; // "HH:MM", default "08:00"
  eveningEnabled: boolean;
  eveningTime: string; // "HH:MM", default "20:00"
  weeklyEnabled: boolean;
  weeklyDay: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (default 0)
  weeklyTime: string; // "HH:MM", default "18:00"
  streakEnabled: boolean; // default true
  rewardEnabled: boolean; // default true
  quietHoursEnabled: boolean; // default true
  quietStart: string; // "HH:MM", default "21:00"
  quietEnd: string; // "HH:MM", default "07:00"
  dailyNotificationCap: number; // default 3
  promptDismissed?: boolean;
  fcmToken?: string;
  vapidKey?: string;
  sentLogs?: { [key: string]: string }; // e.g. "morning_2026-11-01": "08:02"
  dailySentCount?: {
    date: string; // YYYY-MM-DD
    count: number;
  };
  updatedAt?: string;
}

export type ReminderType = 'morning' | 'evening' | 'weekly' | 'streak' | 'reward';
