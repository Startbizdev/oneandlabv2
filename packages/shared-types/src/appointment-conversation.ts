export interface AppointmentConversationAttachment {
  id: string;
  file_name?: string | null;
  mime_type?: string | null;
  document_type?: string | null;
}

export interface AppointmentConversationMessage {
  id: string;
  appointment_id: string;
  author_id: string;
  author_name?: string;
  body: string;
  medical_document_id?: string | null;
  attachment?: AppointmentConversationAttachment | null;
  created_at: string;
}

export interface AppointmentConversationPayload {
  messages: AppointmentConversationMessage[];
  can_post: boolean;
}
