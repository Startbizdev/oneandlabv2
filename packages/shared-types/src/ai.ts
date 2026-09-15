export type AiConversationType =
  | 'general'
  | 'assistant_health'
  | 'lab_results'
  | 'medical_document'
  | 'appointment'
  | 'health_tracking'
  | 'professional'
  | 'voice';

export interface AiConversation {
  id: string;
  user_id: string;
  patient_id?: string | null;
  conversation_type: AiConversationType;
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

export interface AiMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    draft?: AiAppointmentDraft;
    disclaimer?: string;
    audit_id?: string | null;
    citation_refs?: string[];
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

export interface AiHubPayload {
  role?: string;
  disclaimer: string;
  quick_suggestions: AiQuickSuggestion[];
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

export interface VoiceRealtimeEventSyncResponse {
  duplicate: boolean;
  event_id: string;
  conversation_id?: string;
  draft?: AiAppointmentDraft | null;
}
