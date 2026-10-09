import type {
  AiAppointmentDraft,
  AiConversationContextType,
  AiEmergency,
  AiMessageSource,
} from '@oneandlab/shared-types';

export type PatientAiChatRole = 'assistant' | 'user';

export type PatientAiChatAttachment = {
  uri: string;
  fileName: string;
  mimeType: string;
  medicalDocumentId?: string;
  documentType?: string;
};

export type PatientAiChatMessage = {
  id: string;
  role: PatientAiChatRole;
  text: string;
  /** Réponse arrêtée par l'utilisateur avant la fin : texte partiel conservé. */
  interrupted?: boolean;
  /** Réponse interrompue : identifiant client de l'envoi, pour relancer ce tour sans dupliquer la question. */
  clientMessageId?: string;
  metadata?: {
    draft?: AiAppointmentDraft;
    disclaimer?: string;
    attachment?: PatientAiChatAttachment;
    sources?: AiMessageSource[];
    emergency?: AiEmergency | null;
    suggestions?: string[];
  };
};

export type PatientAiConversation = {
  id: string;
  title: string;
  messages: PatientAiChatMessage[];
  createdAt: number;
  updatedAt: number;
  isSystem?: boolean;
  isPinned?: boolean;
  archivedAt?: number | null;
  /** Messages plus anciens disponibles côté serveur (`has_more`). */
  hasMore?: boolean;
  contextType?: AiConversationContextType | null;
  contextId?: string | null;
  /** Patient concerné (conversation d'un soignant). */
  patientId?: string | null;
};

/** Identifiant attribué localement avant la réponse serveur (aucune action serveur possible dessus). */
export function isLocalAiMessageId(id: string): boolean {
  return id.startsWith('local-');
}
