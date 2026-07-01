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
  metadata?: {
    draft?: import('@oneandlab/shared-types').AiAppointmentDraft;
    disclaimer?: string;
    attachment?: PatientAiChatAttachment;
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
};
