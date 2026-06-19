import type { UserRole } from '@oneandlab/shared-types';

export type AiDeepLinkParams = {
  conversation_type?: string;
  patient_id?: string;
  appointment_id?: string;
  lab_result_id?: string;
  initial_message?: string;
};

export function aiTabHref(role: UserRole | string): string {
  switch (role) {
    case 'pro':
      return '/(pro)/(tabs)/ai';
    case 'nurse':
      return '/(nurse)/(tabs)/ai';
    case 'preleveur':
      return '/(preleveur)/(tabs)/ai';
    default:
      return '/(patient)/(tabs)/ai';
  }
}

export function buildAiDeepLink(role: UserRole | string, params: AiDeepLinkParams): string {
  const base = aiTabHref(role);
  const qs = new URLSearchParams();
  if (params.conversation_type) qs.set('conversation_type', params.conversation_type);
  if (params.patient_id) qs.set('patient_id', params.patient_id);
  if (params.appointment_id) qs.set('appointment_id', params.appointment_id);
  if (params.lab_result_id) qs.set('lab_result_id', params.lab_result_id);
  if (params.initial_message) qs.set('initial_message', params.initial_message);
  const q = qs.toString();
  return q ? `${base}?${q}` : base;
}

export function mapSuggestionToMessage(id: string): string {
  switch (id) {
    case 'next_appointment':
      return 'Quand est mon prochain rendez-vous ?';
    case 'book':
      return 'Je souhaite prendre un rendez-vous';
    case 'lab_results':
      return 'Explique mes derniers résultats de labo';
    case 'prepare_rdv':
      return 'Prépare mon prochain rendez-vous';
    case 'patient_rdv':
      return 'Je veux planifier un rendez-vous pour un patient';
    default:
      return 'J’ai une question sur mon suivi';
  }
}

export function systemKeyFromConversationType(type?: string): string | null {
  if (type === 'lab_results') return 'lab_results';
  if (type === 'appointment') return 'appointment';
  if (type === 'assistant_health') return 'assistant_health';
  return null;
}
