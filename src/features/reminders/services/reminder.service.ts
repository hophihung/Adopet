import { supabase } from '@/lib/supabase';
import type {
  Reminder,
  ReminderCreateInput,
  ReminderUpdateInput,
  ReminderLog,
  ReminderLogStatus,
} from '../types';
import { computeNextReminderAt } from '../utils/schedule';

export const ReminderService = {
  computeNextReminderAt,

  async createReminder(userId: string, input: Omit<ReminderCreateInput, 'next_reminder_at'> & { next_reminder_at?: string }) {
    const next = input.next_reminder_at || computeNextReminderAt({
      frequency: input.frequency,
      time: input.time,
      days_of_week: input.days_of_week,
      custom_interval: input.custom_interval,
    });

    const { data, error } = await supabase
      .from('pet_care_reminders')
      .insert({
        user_id: userId,
        pet_id: input.pet_id,
        type: input.type,
        title: input.title,
        description: input.description ?? null,
        frequency: input.frequency,
        time: `${input.time}:00`,
        days_of_week: input.days_of_week ?? null,
        custom_interval: input.custom_interval ?? null,
        next_reminder_at: next,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as Reminder;
  },

  async getUserReminders(userId: string, opts?: { pet_id?: string; activeOnly?: boolean }) {
    let query = supabase
      .from('pet_care_reminders')
      .select('*')
      .eq('user_id', userId)
      .order('next_reminder_at', { ascending: true });

    if (opts?.pet_id) query = query.eq('pet_id', opts.pet_id);
    if (opts?.activeOnly) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Reminder[];
  },

  async getReminderById(id: string) {
    const { data, error } = await supabase
      .from('pet_care_reminders')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Reminder;
  },

  async updateReminder(id: string, patch: ReminderUpdateInput) {
    const payload: any = { ...patch };
    if (patch.time && !patch.time.endsWith(':00')) {
      payload.time = `${patch.time}:00`;
    }
    if (patch.frequency || patch.time || patch.days_of_week || patch.custom_interval) {
      payload.next_reminder_at = computeNextReminderAt({
        frequency: (patch.frequency as any) ?? 'daily',
        time: (patch.time as any) ?? '08:00',
        days_of_week: patch.days_of_week ?? null,
        custom_interval: patch.custom_interval ?? null,
      });
    }

    const { data, error } = await supabase
      .from('pet_care_reminders')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as Reminder;
  },

  async deleteReminder(id: string) {
    const { error } = await supabase
      .from('pet_care_reminders')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async toggleReminder(id: string, isActive: boolean) {
    const { data, error } = await supabase
      .from('pet_care_reminders')
      .update({ is_active: isActive })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as Reminder;
  },

  async logAction(reminderId: string, status: ReminderLogStatus, opts?: { notes?: string; snoozed_until?: string }) {
    const { data, error } = await supabase
      .from('reminder_logs')
      .insert({
        reminder_id: reminderId,
        status,
        notes: opts?.notes ?? null,
        snoozed_until: opts?.snoozed_until ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as ReminderLog;
  },

  async getLogs(reminderId: string) {
    const { data, error } = await supabase
      .from('reminder_logs')
      .select('*')
      .eq('reminder_id', reminderId)
      .order('reminded_at', { ascending: false });
    if (error) throw error;
    return (data || []) as ReminderLog[];
  },
};
