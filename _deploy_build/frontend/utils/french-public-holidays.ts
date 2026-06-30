/**
 * Jours fériés métropolitains (11 jours légaux) pour une année civile.
 * Réf. : jours fériés nationaux en France (hors Alsace-Moselle / collectivités).
 */

function easterSundayYmd(year: number): { y: number; m: number; d: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { y: year, m: month, d: day };
}

function addDaysYmd(base: { y: number; m: number; d: number }, days: number): { y: number; m: number; d: number } {
  const dt = new Date(base.y, base.m - 1, base.d);
  dt.setDate(dt.getDate() + days);
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
}

function ymdEqual(a: { y: number; m: number; d: number }, ymdStr: string): boolean {
  const p = ymdStr.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return a.y === y && a.m === mo && a.d === d;
}

/** Liste des dates fériées (métropole) pour l’année de `ymd` (chaîne `YYYY-MM-DD`). */
export function frenchMetropolitanHolidayYmdsForYear(ymd: string): string[] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return [];
  const year = Number(m[1]);
  const easter = easterSundayYmd(year);
  const easterMonday = addDaysYmd(easter, 1);
  const ascension = addDaysYmd(easter, 39);
  const whitMonday = addDaysYmd(easter, 50);
  const fmt = (x: { y: number; m: number; d: number }) =>
    `${x.y}-${String(x.m).padStart(2, '0')}-${String(x.d).padStart(2, '0')}`;
  return [
    `${year}-01-01`,
    fmt(easterMonday),
    `${year}-05-01`,
    `${year}-05-08`,
    fmt(ascension),
    fmt(whitMonday),
    `${year}-07-14`,
    `${year}-08-15`,
    `${year}-11-01`,
    `${year}-11-11`,
    `${year}-12-25`,
  ];
}

export function isFrenchMetropolitanPublicHoliday(ymd: string): boolean {
  const holidays = frenchMetropolitanHolidayYmdsForYear(ymd);
  const normalized = ymd.trim();
  return holidays.includes(normalized);
}

/** Dimanche civil pour une date `YYYY-MM-DD` (interprétée en date locale du navigateur). */
export function isSundayYmd(ymd: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  return dt.getDay() === 0;
}

export type PremiumDayKind = 'sunday' | 'holiday' | 'both';

/** Dimanche et/ou jour férié métropolitain. */
export function getBloodTestPremiumDayKind(ymd: string | null | undefined): PremiumDayKind | null {
  if (!ymd || !String(ymd).trim()) return null;
  const s = String(ymd).trim();
  const sun = isSundayYmd(s);
  const hol = isFrenchMetropolitanPublicHoliday(s);
  if (sun && hol) return 'both';
  if (sun) return 'sunday';
  if (hol) return 'holiday';
  return null;
}
