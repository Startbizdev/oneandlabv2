import { api } from '@/api/client';

export type QrResolveResult = { redirect_url: string; token: string; scan_id?: string | null };

/** Résout un QR Cary et enregistre le scan (`GET /qr/resolve`, sans session requise). */
export async function resolveQrToken(token: string): Promise<QrResolveResult> {
  const res = await api.get<QrResolveResult>(`/qr/resolve?token=${encodeURIComponent(token)}`);
  if (!res.success || !res.data?.redirect_url) throw new Error(res.error ?? 'QR code introuvable');
  return res.data;
}
