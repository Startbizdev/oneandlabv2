import { parseAppointmentDateFrance } from '@oneandlab/shared-utils';

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
  const milliseconds = parseAppointmentDateFrance(iso).getTime();
  return Number.isNaN(milliseconds) ? null : milliseconds;
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
