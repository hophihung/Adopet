import { supabase } from '@/lib/supabase';

export type ReportType = 'spam' | 'inappropriate' | 'harassment' | 'fake' | 'other';
export type ReportTargetType = 'post' | 'reel' | 'user' | 'product' | 'pet';

export interface Report {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  report_type: ReportType;
  reason: string;
  evidence_urls?: string[];
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
}

export const ReportService = {
  async createReport(data: {
    target_type: ReportTargetType;
    target_id: string;
    report_type: ReportType;
    reason: string;
    evidence_urls?: string[];
  }): Promise<Report | null> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return null;

    const { data: report, error } = await supabase
      .from('content_reports')
      .insert({
        reporter_id: user.user.id,
        ...data,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating report:', error);
      return null;
    }

    return report;
  },

  async getMyReports(): Promise<Report[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return [];

    const { data, error } = await supabase
      .from('content_reports')
      .select('*')
      .eq('reporter_id', user.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting reports:', error);
      return [];
    }

    return data || [];
  },
};

