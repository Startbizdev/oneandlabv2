import { api } from '@/api/client';

export interface AppNotification {
  id: string;
  title?: string;
  message?: string;
  read_at?: string | null;
  appointment_id?: string;
  created_at?: string;
}

export async function fetchNotifications(limit = 10) {
  return api.get<AppNotification[]>(`/notifications?limit=${limit}`);
}

export async function markNotificationRead(id: string) {
  return api.put(`/notifications/${id}/read`);
}
