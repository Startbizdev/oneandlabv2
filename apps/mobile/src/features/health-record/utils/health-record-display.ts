export const HEALTH_RECORD_EMPTY_LABEL = 'Non renseigné';
export const HEALTH_RECORD_OPTIONAL_BADGE = 'Optionnel';
/** @deprecated Utiliser HEALTH_RECORD_OPTIONAL_BADGE */
export const HEALTH_RECORD_EMPTY_HINT = HEALTH_RECORD_OPTIONAL_BADGE;

const ENUM_LABELS: Record<string, string> = {
  yes: 'Oui',
  no: 'Non',
  unknown: 'Je ne sais pas',
  je_ne_sais_pas: 'Je ne sais pas',
  never: 'Jamais',
  former: 'Ancien fumeur',
  occasional: 'Occasionnel',
  regular: 'Régulier',
  sedentary: 'Sédentaire',
  moderate: 'Modérée',
  active: 'Active',
};

function isEmptyDisplayToken(value: string): boolean {
  const t = value.trim().toLowerCase();
  return t === '' || t === '—' || t === 'null' || t === 'undefined' || t === '[object object]';
}

/** Dé-enveloppe { value } récursif (legacy mobile / double save). */
export function unwrapHealthRecordValue(value: unknown): unknown {
  let v: unknown = value;
  for (let depth = 0; depth < 4; depth++) {
    if (v != null && typeof v === 'object' && 'value' in (v as Record<string, unknown>)) {
      v = (v as { value: unknown }).value;
      continue;
    }
    break;
  }
  if (typeof v === 'string') {
    const t = v.trim();
    if (t.toLowerCase() === '[object object]' || t.toLowerCase() === 'null') {
      return null;
    }
  }
  return v;
}

export function formatHealthRecordStoredValue(value: unknown): string {
  const unwrapped = unwrapHealthRecordValue(value);
  if (unwrapped === null || unwrapped === undefined || unwrapped === '') {
    return HEALTH_RECORD_EMPTY_LABEL;
  }
  if (typeof unwrapped === 'string') {
    return formatHealthRecordDisplay(unwrapped);
  }
  if (typeof unwrapped === 'number' && Number.isFinite(unwrapped)) {
    return String(unwrapped);
  }
  if (typeof unwrapped === 'boolean') {
    return unwrapped ? 'Oui' : 'Non';
  }
  const key = String(unwrapped);
  if (ENUM_LABELS[key]) {
    return ENUM_LABELS[key];
  }
  return HEALTH_RECORD_EMPTY_LABEL;
}

/** Valeur vide renvoyée par l’API (legacy ou actuelle). */
export function isHealthRecordValueFilled(display: string | undefined | null): boolean {
  if (display == null) return false;
  return !isEmptyDisplayToken(display) && display !== HEALTH_RECORD_EMPTY_LABEL;
}

/** Normalise l’affichage récap (legacy tiret cadratin, chaîne "null", object). */
export function formatHealthRecordDisplay(display: string | undefined | null | unknown): string {
  if (display != null && typeof display !== 'string') {
    return formatHealthRecordStoredValue(display);
  }
  if (display == null || isEmptyDisplayToken(display)) {
    return HEALTH_RECORD_EMPTY_LABEL;
  }
  if (display === HEALTH_RECORD_EMPTY_LABEL) {
    return HEALTH_RECORD_EMPTY_LABEL;
  }
  const enumLabel = ENUM_LABELS[display];
  return enumLabel ?? display;
}

export function healthRecordFieldAccessibilityLabel(
  label: string,
  display: string,
  filled: boolean,
): string {
  if (filled) {
    return `${label} : ${display}`;
  }
  return `${label} : ${HEALTH_RECORD_EMPTY_LABEL}, optionnel.`;
}

/** Sous-titre hero récap / carte RDV — le % est déjà dans l'anneau. */
export function healthRecordHeroSubtitle(percent: number): string {
  if (percent >= 100) return 'Carnet à jour.';
  if (percent >= 75) return 'Vous y êtes presque.';
  if (percent >= 35) return 'Complétez à votre rythme.';
  return 'Pour des soins personnalisés.';
}

/** Sous-titre vue staff — sans répéter le pourcentage (déjà dans l'anneau). */
export function healthRecordStaffHeroSubtitle(percent: number, missingCount = 0): string {
  if (percent >= 100) return 'Carnet à jour.';
  if (missingCount > 0) {
    return missingCount === 1
      ? '1 information à compléter.'
      : `${missingCount} informations à compléter.`;
  }
  if (percent >= 75) return 'Presque complet.';
  if (percent >= 35) return 'Données partiellement renseignées.';
  return 'Carnet peu renseigné.';
}
