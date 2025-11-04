export type ReminderType = 'feeding' | 'medicine' | 'health_check' | 'bathing' | 'vaccination' | 'exercise';
export type ReminderFrequency = 'daily' | 'weekly' | 'monthly' | 'custom';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sun ... 6 = Sat

export interface Reminder {
  id: string;
  pet_id: string;
  user_id: string;
  type: ReminderType;
  title: string;
  description?: string | null;
  frequency: ReminderFrequency;
  time: string; // HH:MM:SS from Postgres time
  days_of_week?: DayOfWeek[] | null;
  custom_interval?: number | null;
  notification_id?: string | null;
  is_active: boolean;
  last_reminded_at?: string | null; // ISO
  next_reminder_at: string; // ISO
  created_at: string;
  updated_at: string;
}

export interface ReminderCreateInput {
  pet_id: string;
  type: ReminderType;
  title: string;
  description?: string;
  frequency: ReminderFrequency;
  time: string; // "HH:MM"
  days_of_week?: DayOfWeek[];
  custom_interval?: number;
  next_reminder_at: string; // ISO, computed on client
}

export interface ReminderUpdateInput extends Partial<ReminderCreateInput> {
  is_active?: boolean;
  notification_id?: string | null;
}

export type ReminderLogStatus = 'completed' | 'snoozed' | 'dismissed';

export interface ReminderLog {
  id: string;
  reminder_id: string;
  reminded_at: string; // ISO
  status: ReminderLogStatus;
  notes?: string | null;
  snoozed_until?: string | null;
  created_at: string;
}
