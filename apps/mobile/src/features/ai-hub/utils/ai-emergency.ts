import type { AiEmergency, AiEmergencyAction } from '@oneandlab/shared-types';

/** Numéros d'urgence toujours proposés (France) : SAMU, numéro européen, prévention du suicide. */
export const EMERGENCY_ACTIONS: readonly AiEmergencyAction[] = [
  { label: 'Appeler le 15', phone: '15' },
  { label: 'Appeler le 112', phone: '112' },
  { label: 'Appeler le 3114', phone: '3114' },
];

/** URL `tel:` d'un numéro (chiffres et `+` uniquement), sinon `null`. */
export function emergencyTelUrl(phone: string): string | null {
  const dialable = phone.replace(/[^\d+]/g, '');
  return dialable ? `tel:${dialable}` : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeActions(raw: unknown): AiEmergencyAction[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!isRecord(item) || typeof item.phone !== 'string' || !emergencyTelUrl(item.phone)) return [];
    const label = typeof item.label === 'string' && item.label.trim() ? item.label.trim() : `Appeler le ${item.phone}`;
    return [{ label, phone: item.phone }];
  });
}

/** Charge utile `emergency` (réponse ou événement SSE) validée ; numéros par défaut si le serveur n'en fournit pas. */
export function normalizeAiEmergency(raw: unknown): AiEmergency | null {
  if (!isRecord(raw)) return null;
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const body = typeof raw.body === 'string' ? raw.body.trim() : '';
  if (!title && !body) return null;
  const actions = normalizeActions(raw.actions);
  return {
    kind: typeof raw.kind === 'string' ? raw.kind : 'emergency',
    title: title || 'Urgence',
    body,
    actions: actions.length > 0 ? actions : [...EMERGENCY_ACTIONS],
  };
}
