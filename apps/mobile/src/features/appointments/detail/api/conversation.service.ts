import type { AppointmentConversationPayload } from '@oneandlab/shared-types';
import { api } from '@/api/client';

export async function fetchAppointmentConversation(appointmentId: string) {
  return api.get<AppointmentConversationPayload>(`/appointments/${appointmentId}/conversation`);
}

export async function postAppointmentConversationMessage(appointmentId: string, body: string) {
  return api.post(`/appointments/${appointmentId}/conversation`, { body });
}

export async function postAppointmentConversationAttachment(
  appointmentId: string,
  file: { uri: string; name: string; type: string },
  body?: string,
) {
  const fd = new FormData();
  fd.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  if (body?.trim()) fd.append('body', body.trim());
  return api.post(`/appointments/${appointmentId}/conversation`, fd);
}
