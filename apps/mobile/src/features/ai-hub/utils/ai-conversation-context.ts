import type { MobileRole } from '@oneandlab/shared-constants';
import type { AiConversationType } from '@oneandlab/shared-types';
import { systemKeyFromConversationType, type AiDeepLinkParams } from './ai-navigation';

type AiObjectContextType = 'appointment' | 'lab_result' | 'patient';

/** Conversation que l'écran Cary doit ouvrir pour les paramètres de route reçus. */
export type AiConversationContext =
  | {
      kind: 'object';
      key: string;
      contextType: AiObjectContextType;
      contextId: string;
      conversationType: AiConversationType;
      patientId?: string;
      initialMessage?: string;
    }
  | { kind: 'system'; key: string; systemKey: string; initialMessage?: string }
  | { kind: 'general'; key: 'general'; initialMessage?: string };

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Une conversation par objet : rendez-vous, puis résultat, puis patient (soignant uniquement).
 * La clé change dès que l'objet change, ce qui réinitialise l'écran.
 */
export function resolveAiConversationContext(
  role: MobileRole,
  params: AiDeepLinkParams,
): AiConversationContext {
  const initialMessage = clean(params.initial_message);
  const patientId = clean(params.patient_id);
  const appointmentId = clean(params.appointment_id);
  if (appointmentId) {
    return {
      kind: 'object',
      key: `appointment:${appointmentId}`,
      contextType: 'appointment',
      contextId: appointmentId,
      conversationType: 'appointment',
      patientId,
      initialMessage,
    };
  }
  const labResultId = clean(params.lab_result_id);
  if (labResultId) {
    return {
      kind: 'object',
      key: `lab_result:${labResultId}`,
      contextType: 'lab_result',
      contextId: labResultId,
      conversationType: 'lab_results',
      patientId,
      initialMessage,
    };
  }
  if (patientId && (role === 'nurse' || role === 'pro')) {
    return {
      kind: 'object',
      key: `patient:${patientId}`,
      contextType: 'patient',
      contextId: patientId,
      conversationType: 'general',
      patientId,
      initialMessage,
    };
  }
  const systemKey = systemKeyFromConversationType(clean(params.conversation_type));
  if (systemKey) return { kind: 'system', key: `system:${systemKey}`, systemKey, initialMessage };
  return { kind: 'general', key: 'general', initialMessage };
}

/** Patient sur lequel porte la conversation (soignant), sinon `undefined`. */
export function contextPatientId(context: AiConversationContext): string | undefined {
  return context.kind === 'object' ? context.patientId : undefined;
}
