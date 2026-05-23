import { formatBellNotificationLines } from '@oneandlab/shared-utils';
import type { AppNotification } from '@/features/notifications/api/notifications.service';

function readDataField(data: AppNotification['data'], key: string): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

export function resolveNotificationDisplayLines(item: AppNotification): {
  label: string;
  message?: string;
} {
  const title = item.title?.trim() || readDataField(item.data, 'title');
  const body = item.message?.trim() || readDataField(item.data, 'message');
  return formatBellNotificationLines(title, body);
}
