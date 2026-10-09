import type { Href } from 'expo-router';
import type { MobileRole } from '@oneandlab/shared-constants';

export type AiDeepLinkParams = {
  conversation_type?: string;
  patient_id?: string;
  appointment_id?: string;
  lab_result_id?: string;
  initial_message?: string;
};

type AiTabPathname = '/(pro)/ai' | '/(nurse)/ai' | '/(preleveur)/ai' | '/(patient)/(tabs)/ai';

/** Laboratoire et admin n'ont pas d'assistant mobile (403 `AI_ROLE_NOT_SUPPORTED`) : aucun repli. */
function aiTabPathname(role: MobileRole): AiTabPathname {
  switch (role) {
    case 'pro':
      return '/(pro)/ai';
    case 'nurse':
      return '/(nurse)/ai';
    case 'preleveur':
      return '/(preleveur)/ai';
    case 'patient':
      return '/(patient)/(tabs)/ai';
  }
}

export function buildAiDeepLink(role: MobileRole, params: AiDeepLinkParams): Href {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value) query[key] = value;
  }
  return { pathname: aiTabPathname(role), params: query };
}

export function mapSuggestionToMessage(id: string): string {
  switch (id) {
    case 'next_appointment':
      return 'Quand est mon prochain rendez-vous ?';
    case 'book':
      return 'Je souhaite prendre un rendez-vous';
    case 'lab_results':
      return 'Explique mes derniers résultats de labo';
    case 'patient_lab_results':
      return 'Résume les derniers résultats de labo reçus pour mes patients';
    case 'analyze_docs':
      return 'Analyse mes documents médicaux récents et résume-les pour moi';
    case 'patient_docs':
      return 'Analyse les documents médicaux récents de ce patient et résume-les';
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
    case 'case_question':
      return 'J’ai une question sur le dossier d’un patient';
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
