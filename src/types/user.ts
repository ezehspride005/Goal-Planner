import { ReminderSettings } from './reminder';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  firstName?: string;
  appPurpose?: string;
  onboarded: boolean;
  emailVerified: boolean;
  authProvider: 'google' | 'password';
  reminderSettings?: ReminderSettings;
  createdAt: string;
  updatedAt?: string;
}

export type AppPurposeOption =
  | 'Network Marketing & Direct Sales'
  | 'Business & Client Revenue'
  | 'Health & Physical Fitness'
  | 'Creative Writing & Arts'
  | 'Personal Mastery & Habits'
  | 'Academic & Professional Career';
