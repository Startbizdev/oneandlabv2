export type QrFunnelStats = {
  scans: number;
  visits: number;
  conversions: number;
  conversion_rate: number;
};

export type QrPosterFormat = 'story' | 'print' | 'square';

export type QrCodeRecord = {
  id: string;
  profile_id: string;
  user_role: 'nurse' | 'lab' | 'subaccount' | 'pro';
  token: string;
  redirect_url: string;
  scan_url?: string;
  short_url?: string;
  marketing_tagline?: string | null;
  effective_tagline?: string;
  display_name?: string;
  profile_image_url?: string | null;
  is_active?: boolean;
};

export type QrAnalyticsSummary = {
  days_7: QrFunnelStats;
  days_30: QrFunnelStats;
  all_time: QrFunnelStats;
};

export type QrAdminListItem = QrCodeRecord & {
  analytics: QrFunnelStats;
};
