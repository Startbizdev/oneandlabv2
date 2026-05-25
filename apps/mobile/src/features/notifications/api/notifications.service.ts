import { api } from '@/api/client';

export interface AppNotification {
  id: string;
  title?: string;
  message?: string;
  read_at?: string | null;
  appointment_id?: string;
  created_at?: string;
  type?: string;
  data?: Record<string, unknown> | string;
}

export type NotificationsPageMeta = {
  limit: number;
  offset: number;
  has_more: boolean;
};

export type NotificationsPageResponse = {
  items: AppNotification[];
  pagination: NotificationsPageMeta;
};

export const NOTIFICATIONS_PAGE_SIZE = 10;

export async function fetchNotificationsPage(
  limit = NOTIFICATIONS_PAGE_SIZE,
  offset = 0,
): Promise<NotificationsPageResponse> {
  const res = await api.get<AppNotification[]>(
    `/notifications?limit=${limit}&offset=${offset}`,
  );
  if (!res.success) {
    throw new Error(res.error ?? 'Erreur chargement notifications');
  }
  const pagination = (res.pagination ?? {}) as Partial<NotificationsPageMeta>;
  const items = res.data ?? [];
  const hasMore =
    typeof pagination.has_more === 'boolean'
      ? pagination.has_more
      : items.length >= limit;
  return {
    items,
    pagination: {
      limit: pagination.limit ?? limit,
      offset: pagination.offset ?? offset,
      has_more: hasMore,
    },
  };
}

/** @deprecated Préférer fetchNotificationsPage */
export async function fetchNotifications(limit = 10) {
  return api.get<AppNotification[]>(`/notifications?limit=${limit}`);
}

/** Compteur non lues — 1 requête SQL COUNT (évite GET /notifications?limit=50). */
export async function fetchUnreadNotificationsCount() {
  const res = await api.get<{ count: number }>('/notifications/unread?count=1');
  if (!res.success) {
    throw new Error(res.error ?? 'Erreur compteur notifications');
  }
  return res.data?.count ?? 0;
}

export async function markNotificationRead(id: string) {
  return api.put(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  return api.put<{ marked: number }>('/notifications/read-all');
}
