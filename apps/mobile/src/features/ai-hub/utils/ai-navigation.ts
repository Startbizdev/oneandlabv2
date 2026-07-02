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
      return '/(pro)/ai';
    case 'nurse':
      return '/(nurse)/ai';
    case 'preleveur':
      return '/(preleveur)/ai';
    default:
      return '/(patient)/(tabs)/ai';
  }
}

/** Détail RDV après création — aligné wizard / formulaire staff. */
export function appointmentDetailHref(role: UserRole | string, appointmentId: string): string {
  switch (role) {
    case 'nurse':
      return `/(nurse)/appointment/${appointmentId}`;
    case 'preleveur':
      return `/(preleveur)/appointment/${appointmentId}`;
    case 'pro':
      return `/(pro)/appointment/${appointmentId}`;
    default:
      return `/(patient)/appointment/${appointmentId}`;
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
    case 'analyze_docs':
      return 'Analyse mes documents médicaux récents et résume-les pour moi';
    case 'health_trends':
      return 'Comment va mon activité cette semaine ? Montre-moi mes tendances santé récentes.';
    case 'complete_health_record':
      return 'Aide-moi à compléter mon carnet de santé : dis-moi mon pourcentage, ce qui manque en priorité et où aller dans l’app Cary.';
    case 'book_blood_test':
      return 'Je souhaite réserver une prise de sang pour un bilan.';
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
  if (type === 'health_tracking') return 'health_tracking';
  return null;
}
