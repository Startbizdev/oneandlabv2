/** Assistant Cary (`/api/assistant/*`) : conversation en streaming, historique, dictée soignant. */

export type AssistantActionType =
  | 'book_appointment'
  | 'open_appointment'
  | 'open_lab_results'
  | 'open_health_record'
  | 'open_tour'
  | 'create_transmission'
  | 'call_emergency'
  /** Patient : accord pour que Cary lise lui-même son dernier compte rendu d'analyses. */
  | 'enable_results_reading';

/** Carte d'action proposée par Cary ; l'app ouvre l'écran existant, l'utilisateur valide. Type inconnu ignoré. */
export interface AssistantAction {
  /** `AssistantActionType` attendu ; reste une chaîne pour tolérer un type ajouté plus tard côté serveur. */
  type: string;
  label: string;
  params: Record<string, string | undefined>;
}

export type AssistantContextType = 'appointment' | 'lab_result' | 'patient' | 'health' | 'general';

export interface AssistantChatRequest {
  conversation_id?: string;
  /** 1 à 4000 caractères. */
  message: string;
  /** UUID généré par l'app : renvoyer le même rejoue la réponse au lieu d'en créer une seconde. */
  client_message_id: string;
  context?: { type: AssistantContextType; id?: string };
  /** Soignant : patient sélectionné. */
  patient_id?: string;
  /** Document (`medical_documents.id`) joint au message. */
  document_id?: string;
}

export interface AssistantEmergency {
  message: string;
  number: string;
}

export type AssistantErrorCode =
  | 'ASSISTANT_RATE_LIMITED'
  | 'ASSISTANT_UNAVAILABLE'
  | 'ASSISTANT_TIMEOUT'
  | 'ASSISTANT_ROLE_NOT_SUPPORTED'
  | 'ASSISTANT_MESSAGE_IN_PROGRESS'
  | 'VALIDATION_ERROR'
  | 'FORBIDDEN'
  | 'NOT_FOUND';

/** Événements SSE de `POST /assistant/chat`. */
export type AssistantStreamEvent =
  | { event: 'start'; data: { conversation_id: string; user_message_id: string } }
  | { event: 'status'; data: { text: string } }
  | { event: 'delta'; data: { text: string } }
  | { event: 'action'; data: AssistantAction }
  | { event: 'emergency'; data: AssistantEmergency }
  | {
      event: 'done';
      data: { message_id: string; conversation_id: string; text: string; actions: AssistantAction[]; patient_id?: string };
    }
  | { event: 'error'; data: { code: string; message: string; retry_after?: number } }
  | { event: 'end'; data: Record<string, never> };

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actions: AssistantAction[];
  created_at: string;
}

export interface AssistantConversationSummary {
  id: string;
  title: string;
  updated_at: string;
  last_message_preview: string | null;
}

export interface AssistantConversation {
  id: string;
  title: string;
  /** Soignant : patient dont parle la conversation, compris par Cary à partir de la question. */
  patient_id?: string | null;
  messages: AssistantMessage[];
}

/** `GET|PUT /assistant/settings` (patient) : lecture automatique des résultats, accord révocable. */
export interface AssistantSettings {
  results_reading: boolean;
  results_reading_since: string | null;
}

export interface AssistantDictationRequest {
  /** 1 à 8000 caractères. */
  transcript: string;
  patient_id: string;
  appointment_id?: string;
}

export interface AssistantDictationResponse {
  text: string;
}
