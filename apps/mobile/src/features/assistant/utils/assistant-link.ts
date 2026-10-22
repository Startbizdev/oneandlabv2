import type { Href } from 'expo-router';
import type { MobileRole } from '@oneandlab/shared-constants';
import type { AssistantContextType } from '@oneandlab/shared-types';

/** Paramètres de route de l'assistant (liens profonds depuis un RDV, un résultat, la santé…). */
export type AssistantLinkParams = {
  context_type?: AssistantContextType;
  context_id?: string;
  patient_id?: string;
  /** Envoyé automatiquement une fois à l'ouverture. */
  initial_message?: string;
};

const ASSISTANT_PATHNAMES = {
  patient: '/(patient)/(tabs)/ai',
  nurse: '/(nurse)/ai',
  pro: '/(pro)/ai',
  preleveur: '/(preleveur)/ai',
} as const satisfies Record<MobileRole, string>;

/** Écran assistant du rôle, avec seulement les paramètres renseignés. */
export function buildAssistantLink(role: MobileRole, params: AssistantLinkParams = {}): Href {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value) query[key] = value;
  }
  return { pathname: ASSISTANT_PATHNAMES[role], params: query };
}

const CONTEXT_TYPES: AssistantContextType[] = ['appointment', 'lab_result', 'patient', 'health', 'general'];

export function parseContextType(value: string | undefined): AssistantContextType | undefined {
  return CONTEXT_TYPES.find((t) => t === value);
}
