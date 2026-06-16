import { api } from '@/api/client';
import { getApiBase } from '@/config/env';
import { getAuthToken } from '@/lib/auth-token';
import * as FileSystem from 'expo-file-system/legacy';

export type QrFunnelStats = {
  scans: number;
  visits: number;
  conversions: number;
  conversion_rate: number;
};

export type QrMePayload = {
  qr: {
    id: string;
    token: string;
    scan_url: string;
    short_url: string;
    effective_tagline: string;
    marketing_tagline?: string | null;
    display_name?: string;
    profile_image_url?: string | null;
  };
  analytics: {
    days_7: QrFunnelStats;
    days_30: QrFunnelStats;
    all_time: QrFunnelStats;
  };
};

export async function fetchQrMe() {
  const res = await api.get<QrMePayload>('/qr/me');
  if (!res.success || !res.data) {
    throw new Error(res.error ?? 'Impossible de charger le QR');
  }
  return res.data;
}

export async function updateQrTagline(marketingTagline: string | null) {
  const res = await api.patch<{ qr: QrMePayload['qr'] }>('/qr/me', {
    marketing_tagline: marketingTagline,
  });
  if (!res.success) {
    throw new Error(res.error ?? 'Enregistrement impossible');
  }
  return res.data;
}

export async function downloadQrPngToCache(raw = false): Promise<string> {
  const token = getAuthToken();
  const url = `${getApiBase()}/qr/me/png?format=a4${raw ? '&raw=1' : ''}`;
  const dest = `${FileSystem.cacheDirectory ?? ''}cary-qr-${raw ? 'raw' : 'poster'}.png`;
  const result = await FileSystem.downloadAsync(url, dest, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (result.status !== 200) {
    throw new Error('Téléchargement impossible');
  }
  return result.uri;
}
