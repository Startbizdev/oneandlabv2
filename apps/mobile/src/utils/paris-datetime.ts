/** Horodatages métier affichés en fuseau Europe/Paris (aligné backend). */

export const PARIS_TZ = 'Europe/Paris';

export type ParisInstantParts = {
  ymd: string;
  hour: number;
  minute: number;
  second: number;
};

export function parisInstantParts(ms: number): ParisInstantParts | null {
  try {
    const fmt = new Intl.DateTimeFormat('fr-FR', {
      timeZone: PARIS_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(new Date(ms));
    const get = (t: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === t)?.value ?? '';
    return {
      ymd: `${get('year')}-${get('month')}-${get('day')}`,
      hour: Number(get('hour')),
      minute: Number(get('minute')),
      second: Number(get('second')),
    };
  } catch {
    return null;
  }
}

/**
 * Parse une date API (ISO UTC ou DATETIME MySQL sans fuseau = horloge Paris serveur).
 */
export function parseParisWallClock(iso?: string | null): number | null {
  if (!iso?.trim()) return null;
  const raw = iso.trim();
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(raw)) {
    const ms = Date.parse(raw);
    return Number.isNaN(ms) ? null : ms;
  }

  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) {
    const ms = Date.parse(raw);
    return Number.isNaN(ms) ? null : ms;
  }

  const [, y, mo, d, h, mi, se] = m;
  const targetWall = `${y}-${mo}-${d}T${h}:${mi}:${se ?? '00'}`;
  let guess = Date.parse(`${targetWall}Z`);
  if (Number.isNaN(guess)) return null;

  for (let i = 0; i < 4; i++) {
    const parts = parisInstantParts(guess);
    if (!parts) return guess;
    const actualWall = `${parts.ymd}T${pad2(parts.hour)}:${pad2(parts.minute)}:${pad2(parts.second)}`;
    if (actualWall === targetWall) return guess;

    const targetSec = Number(h) * 3600 + Number(mi) * 60 + Number(se ?? 0);
    const actualSec = parts.hour * 3600 + parts.minute * 60 + parts.second;
    const dayDiff = ymdToOrdinal(`${y}-${mo}-${d}`) - ymdToOrdinal(parts.ymd);
    guess += (targetSec - actualSec + dayDiff * 86400) * 1000;
  }

  return guess;
}

export function formatParisHm(ms: number): string {
  return new Date(ms).toLocaleTimeString('fr-FR', {
    timeZone: PARIS_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatParisWeekdayDate(ms: number): string {
  const weekday = new Intl.DateTimeFormat('fr-FR', {
    timeZone: PARIS_TZ,
    weekday: 'short',
  }).format(ms);
  const rest = new Intl.DateTimeFormat('fr-FR', {
    timeZone: PARIS_TZ,
    day: 'numeric',
    month: 'short',
  }).format(ms);
  return `${weekday} ${rest}`;
}

export function formatParisDayMonthYear(ms: number): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: PARIS_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(ms);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function ymdToOrdinal(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return y * 372 + m * 31 + d;
}
