export type AiConversationType =
  | 'general'
  | 'assistant_health'
  | 'lab_results'
  | 'medical_document'
  | 'appointment'
  | 'health_tracking'
  | 'professional'
  | 'voice';

/** Objet auquel une conversation est rattachée (`POST /ai/conversations` avec `context_type` + `context_id`). */
export type AiConversationContextType = 'general' | 'appointment' | 'lab_result' | 'patient';

export interface AiConversation {
  id: string;
  user_id: string;
  patient_id?: string | null;
  conversation_type: AiConversationType;
  context_type?: AiConversationContextType | null;
  context_id?: string | null;
  channel?: 'text' | 'voice';
  custom_title?: string | null;
  is_pinned?: boolean;
  archived_at?: string | null;
  is_system?: boolean;
  system_key?: string | null;
  message_count?: number;
  last_message_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export type AiMessageSourceType = 'document' | 'appointment' | 'result' | 'prescription';

/** Donnée du dossier sur laquelle s'appuie une réponse (pastille cliquable). */
export interface AiMessageSource {
  type: AiMessageSourceType;
  id: string;
  label: string;
}

export interface AiEmergencyAction {
  label: string;
  phone: string;
}

/** Réponse fixe du détecteur d'urgence serveur (avant le modèle). */
export interface AiEmergency {
  kind: string;
  title: string;
  body: string;
  actions: AiEmergencyAction[];
}

/** `metadata.attachment` du message utilisateur : premier document envoyé via `medical_document_ids`. */
export interface AiMessageAttachmentMetadata {
  medicalDocumentId: string;
  fileName: string;
  mimeType: string;
  documentType: string;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  client_message_id?: string | null;
  sources?: AiMessageSource[];
  metadata?: {
    draft?: AiAppointmentDraft;
    disclaimer?: string;
    audit_id?: string | null;
    citation_refs?: string[];
    sources?: AiMessageSource[];
    emergency?: AiEmergency | null;
    attachment?: AiMessageAttachmentMetadata | null;
  } | null;
  created_at?: string | null;
}

export interface AiQuickSuggestion {
  id: string;
  label: string;
}

export type AiDraftStatus = 'collecting' | 'ready' | 'confirmed' | 'expired' | 'cancelled';

export interface AiAppointmentDraft {
  id: string;
  user_id: string;
  patient_id?: string | null;
  conversation_id?: string | null;
  status: AiDraftStatus;
  payload: Record<string, unknown>;
  missing_fields: string[];
  created_by_role: string;
  appointment_id?: string | null;
  expires_at: string;
  recap?: {
    type?: string | null;
    scheduled_at?: string | null;
    date_label?: string | null;
    slot_label?: string | null;
    address_label?: string | null;
    category_id?: string | null;
    category_name?: string | null;
    patient_mode?: string | null;
    profile_documents?: string[];
    missing_documents?: string[];
    beneficiary_name?: string | null;
    care_option_lines?: string[];
    services?: Array<{ name?: string | null; type?: string | null; category_name?: string | null }>;
    attached_documents?: string[];
    document_entries?: Array<{
      type?: string;
      label?: string;
      source?: 'profile' | 'appointment';
      medical_document_id?: string;
      file_name?: string | null;
    }>;
  };
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AiAttachment {
  id: string;
  conversation_id: string;
  medical_document_id?: string | null;
  attachment_type: string;
  file_name: string;
  mime_type?: string | null;
  created_at?: string | null;
}

export interface AiChatResponse {
  message: AiMessage;
  draft?: AiAppointmentDraft | null;
  disclaimer: string;
  audit_id?: string | null;
  conversation?: AiConversation | null;
  emergency?: AiEmergency | null;
  suggestions?: string[];
  /** Rejeu d'un `client_message_id` déjà traité : même réponse, rien de nouveau en base. */
  deduplicated?: boolean;
  /** Régénération (`regenerate_of`) : id de la réponse remplacée, à retirer de l'affichage. `null` sinon. */
  replaced_message_id?: string | null;
}

/**
 * Corps de `POST /ai/chat` et `POST /ai/chat/stream`.
 * Avec `regenerate_of` (id de la dernière réponse assistant), la question d'origine est relancée côté serveur :
 * `message` est ignoré et `medical_document_ids` refusé.
 */
export interface AiChatRequest {
  conversation_id: string;
  message?: string;
  client_message_id?: string;
  medical_document_ids?: string[];
  draft_id?: string | null;
  regenerate_of?: string;
}

/** `DELETE /ai/conversations/{id}` : suppression définitive, nombre d'éléments supprimés. */
export interface AiConversationDeleteResponse {
  deleted: {
    messages: number;
    voice_sessions: number;
    drafts: number;
  };
}

/** `GET /ai/conversations/{id}?before=&limit=` : N derniers messages, ordre chronologique. */
export interface AiConversationDetail {
  conversation: AiConversation;
  messages: AiMessage[];
  draft?: AiAppointmentDraft | null;
  has_more?: boolean;
}

export type AiReportStatus = 'draft' | 'validated' | 'published';

/**
 * Compte rendu dicté (`POST /ai/reports/dictate`, `PATCH /ai/reports/{id}` tant qu'il est en brouillon,
 * `/validate`, `/publish`).
 */
export interface AiReport {
  id: string;
  patient_id: string;
  appointment_id?: string | null;
  report_type: string;
  status: AiReportStatus;
  content_text: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export type VoiceTransport = 'rest' | 'realtime';

export interface VoiceRealtimeSessionConfig {
  voice: string;
  instructions: string;
  turn_detection: { type: 'server_vad' };
  tools: Array<Record<string, unknown>>;
  audio: {
    input: {
      format: { type: string; rate: number };
      transport: 'binary' | 'json';
      transcription?: { language_hint?: string };
    };
    output: {
      format: { type: string; rate: number };
      transport: 'binary' | 'json';
    };
  };
  resumption?: { enabled: boolean };
}

export interface VoiceRealtimeStartResponse {
  session_id: string;
  conversation_id: string;
  transport: VoiceTransport;
  ephemeral_token: string;
  token_expires_at: number;
  websocket_url: string;
  disclaimer: string;
  draft?: AiAppointmentDraft | null;
  session_config: VoiceRealtimeSessionConfig;
  welcome_text?: string | null;
}

export interface VoiceRealtimeToolResponse {
  tool: string;
  result: Record<string, unknown>;
  draft?: AiAppointmentDraft | null;
  conversation_id: string;
}

/** `POST /ai/voice/sessions/{id}/events` : réservé aux sessions `transport: 'realtime'`. */
export interface VoiceRealtimeEventSyncResponse {
  duplicate: boolean;
  event_id: string;
  conversation_id?: string;
  draft?: AiAppointmentDraft | null;
  /** Signe d'urgence détecté dans la transcription utilisateur finale. */
  emergency?: AiEmergency | null;
  /** Après `user.transcript.final` : consignes recalculées à appliquer à la session temps réel. */
  session_update?: {
    instructions: string;
    active_intent: string;
    draft?: AiAppointmentDraft | null;
  };
}
