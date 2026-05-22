/** Année minimale dans les sélecteurs de date de naissance (personnes très âgées). */
export const MIN_BIRTH_YEAR = 1900;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const FR_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

export const BIRTH_MONTHS_FR = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' },
] as const;

function isValidYmd(year: number, month: number, day: number): boolean {
  const maxYear = new Date().getFullYear();
  if (year < MIN_BIRTH_YEAR || year > maxYear) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/** Affiche une date ISO (AAAA-MM-JJ) en jj/mm/aaaa. */
export function formatBirthDateFr(raw: string | null | undefined): string {
  if (!raw) return '';
  const iso = birthDateToIso(raw);
  if (!iso) return String(raw).trim();
  const [, y, m, d] = iso.match(ISO_RE)!;
  return `${d}/${m}/${y}`;
}

/** Normalise une saisie ISO ou FR vers AAAA-MM-JJ, ou null si invalide. */
export function birthDateToIso(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const isoMatch = s.match(ISO_RE);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (!isValidYmd(year, month, day)) return null;
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  const frMatch = s.match(FR_RE);
  if (frMatch) {
    const day = Number(frMatch[1]);
    const month = Number(frMatch[2]);
    const year = Number(frMatch[3]);
    if (!isValidYmd(year, month, day)) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return null;
}

export function parseBirthDateParts(
  raw: string | null | undefined,
): { day: number; month: number; year: number } | null {
  const iso = birthDateToIso(raw);
  if (!iso) return null;
  const [, y, m, d] = iso.match(ISO_RE)!;
  return { year: Number(y), month: Number(m), day: Number(d) };
}

export function buildBirthDateIso(
  year: number,
  month: number,
  day: number,
): string | null {
  return birthDateToIso(
    `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  );
}

export function isValidBirthDateIso(raw: string | null | undefined): boolean {
  return birthDateToIso(raw) !== null;
}

/** Âge en années à partir d'une date de naissance (ISO ou FR). */
export function ageFromBirthDate(raw: string | null | undefined): number | null {
  const iso = birthDateToIso(raw);
  if (!iso) return null;
  const [, y, m, d] = iso.match(ISO_RE)!;
  const birth = new Date(Number(y), Number(m) - 1, Number(d));
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}
