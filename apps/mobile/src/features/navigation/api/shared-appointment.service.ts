import { api } from '@/api/client';

/** Lien de partage `/p/rdv/{token}` (WhatsApp, SMS) : rendez-vous visé, sans session requise. */
export async function resolveSharedAppointment(token: string): Promise<string> {
  const res = await api.get<{ appointmentId?: string }>(`/public/shared-appointment/${encodeURIComponent(token)}`);
  const id = res.success ? res.data?.appointmentId : undefined;
  if (!id) throw new Error(res.error ?? 'Demande introuvable');
  return String(id);
}
