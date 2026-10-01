import type { AppNotification } from '@/features/notifications/api/notifications.service';
import { parisInstantParts, parseParisWallClock } from '@/utils/paris-datetime';

export type NotificationFeedRow =
  | { kind: 'header'; key: string; title: string }
  | { kind: 'item'; key: string; item: AppNotification };

type DayGroup = 'today' | 'yesterday' | 'earlier';

const GROUP_TITLES: Record<DayGroup, string> = {
  today: 'Aujourd’hui',
  yesterday: 'Hier',
  earlier: 'Plus tôt',
};

const DAY_MS = 86_400_000;

function parisYmd(ms: number): string | null {
  return parisInstantParts(ms)?.ymd ?? null;
}

function dayGroup(item: AppNotification, todayYmd: string | null, yesterdayYmd: string | null): DayGroup {
  const ms = parseParisWallClock(item.created_at);
  const ymd = ms == null ? null : parisYmd(ms);
  if (ymd && ymd === todayYmd) return 'today';
  if (ymd && ymd === yesterdayYmd) return 'yesterday';
  return 'earlier';
}

/**
 * Regroupe le fil (déjà trié du plus récent au plus ancien par le backend) en
 * « Aujourd’hui », « Hier », « Plus tôt » — jours calculés en Europe/Paris.
 */
export function buildNotificationFeedRows(
  items: AppNotification[],
  nowMs: number = Date.now(),
): NotificationFeedRow[] {
  const todayYmd = parisYmd(nowMs);
  const yesterdayYmd = parisYmd(nowMs - DAY_MS);
  const rows: NotificationFeedRow[] = [];
  let current: DayGroup | null = null;

  for (const item of items) {
    const group = dayGroup(item, todayYmd, yesterdayYmd);
    if (group !== current) {
      rows.push({ kind: 'header', key: `header-${group}`, title: GROUP_TITLES[group] });
      current = group;
    }
    rows.push({ kind: 'item', key: item.id, item });
  }
  return rows;
}
