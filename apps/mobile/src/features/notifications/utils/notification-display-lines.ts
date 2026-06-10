import { formatBellNotificationLines } from '@oneandlab/shared-utils';
import type { AppNotification } from '@/features/notifications/api/notifications.service';

function readDataField(data: AppNotification['data'], key: string): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const value = (data as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

function actorShortFromCompletedMessage(message: string): string | null {
  const actorDone = message.match(/^(.+?) a terminé votre RDV\.?$/i);
  if (!actorDone) return null;
  const short = actorDone[1]
    .trim()
    .replace(/^Le laboratoire /i, '')
    .replace(/^Le préleveur /i, '')
    .replace(/^L'infirmier /i, '');
  return short || null;
}

/** Réécriture des anciennes notifs « RDV terminé · Un avis ? » + variante sans CTA avis. */
function normalizeCompletedAppointmentLines(
  title: string | undefined,
  message: string | undefined,
): { title: string; message: string } {
  const rawTitle = title?.trim() ?? '';
  const rawMessage = message?.trim() ?? '';
  const isLegacy =
    rawTitle === 'RDV terminé' ||
    rawMessage.includes('Un avis') ||
    /a terminé votre RDV\.?$/i.test(rawMessage);

  if (!isLegacy) {
    return { title: rawTitle, message: rawMessage };
  }

  const actorShort = actorShortFromCompletedMessage(rawMessage);
  const body = actorShort
    ? `Votre soin avec ${actorShort} est terminé. Notez votre expérience en 2 minutes — cela aide d'autres patients Cary.`
    : 'Votre soin est terminé. Notez votre expérience en 2 minutes pour aider la communauté Cary.';

  return {
    title: 'Comment s\'est passé votre soin ?',
    message: body,
  };
}

export function resolveNotificationDisplayLines(item: AppNotification): {
  label: string;
  message?: string;
} {
  const title = item.title?.trim() || readDataField(item.data, 'title');
  const body = item.message?.trim() || readDataField(item.data, 'message');

  const normalized =
    item.type === 'appointment_completed'
      ? normalizeCompletedAppointmentLines(title, body)
      : { title: title ?? '', message: body ?? '' };

  return formatBellNotificationLines(normalized.title, normalized.message);
}
