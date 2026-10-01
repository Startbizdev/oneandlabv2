import type { AppNotification } from '@/features/notifications/api/notifications.service';
import { parisInstantParts, parseParisWallClock } from '@/utils/paris-datetime';

export type NotificationFeedRow =
  | { kind: 'header'; key: string; title: string }
  | { kind: 'item'; key: string; item: AppNotification; first: boolean; last: boolean };

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
 * `first` / `last` situent chaque notification dans son groupe (liste groupée).
 */
export function buildNotificationFeedRows(
  items: AppNotification[],
  nowMs: number = Date.now(),
): NotificationFeedRow[] {
  const todayYmd = parisYmd(nowMs);
  const yesterdayYmd = parisYmd(nowMs - DAY_MS);
  const groups = items.map((item) => dayGroup(item, todayYmd, yesterdayYmd));
  const rows: NotificationFeedRow[] = [];

  items.forEach((item, index) => {
    const group = groups[index];
    const first = group !== groups[index - 1];
    if (first) {
      rows.push({ kind: 'header', key: `header-${group}`, title: GROUP_TITLES[group] });
    }
    const last = group !== groups[index + 1];
    rows.push({ kind: 'item', key: item.id, item, first, last });
  });
  return rows;
}
