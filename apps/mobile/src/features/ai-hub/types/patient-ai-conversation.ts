export type PatientAiChatRole = 'assistant' | 'user';

export type PatientAiChatMessage = {
  id: string;
  role: PatientAiChatRole;
  text: string;
  metadata?: {
    draft?: import('@oneandlab/shared-types').AiAppointmentDraft;
    disclaimer?: string;
  };
};

export type PatientAiConversation = {
  id: string;
  title: string;
  messages: PatientAiChatMessage[];
  createdAt: number;
  updatedAt: number;
  isSystem?: boolean;
};
