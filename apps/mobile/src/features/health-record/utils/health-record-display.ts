export const HEALTH_RECORD_EMPTY_LABEL = 'Non renseigné';
export const HEALTH_RECORD_OPTIONAL_BADGE = 'Optionnel';
/** @deprecated Utiliser HEALTH_RECORD_OPTIONAL_BADGE */
export const HEALTH_RECORD_EMPTY_HINT = HEALTH_RECORD_OPTIONAL_BADGE;

/** Valeur vide renvoyée par l’API (legacy ou actuelle). */
export function isHealthRecordValueFilled(display: string | undefined | null): boolean {
  if (!display?.trim()) return false;
  return display !== HEALTH_RECORD_EMPTY_LABEL && display !== '—';
}

/** Normalise l’affichage récap (legacy tiret cadratin). */
export function formatHealthRecordDisplay(display: string): string {
  if (!display?.trim() || display === '—') {
    return HEALTH_RECORD_EMPTY_LABEL;
  }
  return display;
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
