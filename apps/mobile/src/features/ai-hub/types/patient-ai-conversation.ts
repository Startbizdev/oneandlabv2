export type PatientAiChatRole = 'assistant' | 'user';

export type PatientAiChatMessage = {
  id: string;
  role: PatientAiChatRole;
  text: string;
};

export type PatientAiConversation = {
  id: string;
  title: string;
  messages: PatientAiChatMessage[];
  createdAt: number;
  updatedAt: number;
};
