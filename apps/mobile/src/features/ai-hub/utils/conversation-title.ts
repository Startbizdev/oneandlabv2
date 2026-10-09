import type { AiConversation } from '@oneandlab/shared-types';

const SYSTEM_TITLES: Record<string, string> = {
  assistant_health: 'Mon Assistant Santé',
  lab_results: 'Mes résultats',
  appointment: 'Mes rendez-vous',
  health_tracking: 'Mes données santé',
};

const CONTEXT_TITLES: Record<string, string> = {
  appointment: 'Rendez-vous',
  lab_result: "Résultat d'analyse",
  patient: 'Dossier patient',
};

/** Titre affiché dans la liste (style ChatGPT). */
export function resolveConversationTitle(conv: AiConversation): string {
  const custom = conv.custom_title?.trim();
  if (custom) return custom;
  if (conv.is_system) {
    const key = conv.system_key ?? '';
    return SYSTEM_TITLES[key] ?? 'Assistant Cary';
  }
  return CONTEXT_TITLES[conv.context_type ?? ''] ?? 'Nouvelle conversation';
}
