/**
 * Options et libellés pour la "Prise en charge" / durée des soins infirmiers.
 * Utilisé dans NursingForm, AppointmentForm, listes et détails RDV.
 */

export const NURSING_DURATION_OPTIONS = [
  { label: 'Une seule fois', value: '1' },
  { label: 'Quelques jours (environ 1 semaine)', value: '7' },
  { label: 'Environ 2 semaines', value: '15' },
  { label: 'Environ 1 mois', value: '30' },
  { label: 'Plusieurs semaines ou mois', value: '60+' },
  { label: 'Personnaliser', value: 'custom' },
  { label: 'À préciser avec le professionnel', value: 'to_define' },
] as const;

export const NURSING_DURATION_LABELS: Record<string, string> = {
  '1': 'Une seule fois',
  '7': 'Environ 1 semaine',
  '10': 'Environ 10 jours',
  '15': 'Environ 2 semaines',
  '30': 'Environ 1 mois',
  '60+': 'Longue durée',
  to_define: 'À préciser avec le professionnel',
};

/** Affiche la durée des soins (liste, détail, formulaire). */
export function getNursingDurationLabel(durationDays: string | null | undefined, customDays?: number | null): string {
  if (!durationDays) return '';
  if (durationDays === 'to_define') return NURSING_DURATION_LABELS.to_define;
  if (durationDays === 'custom') {
    if (customDays != null && customDays > 0) return `${customDays} jours`;
    return 'Durée personnalisée';
  }
  return NURSING_DURATION_LABELS[durationDays] ?? durationDays;
}

/** Fréquence affichée seulement si durée !== 1 jour et !== to_define */
export function showNursingFrequency(durationDays: string | null | undefined): boolean {
  return !!(durationDays && durationDays !== '1' && durationDays !== 'to_define');
}

/** Options de fréquence des passages (soins infirmiers). Source unique pour formulaires RDV. */
export const NURSING_FREQUENCY_OPTIONS = [
  { label: '1 fois par jour', value: 'once_daily' },
  { label: '2 fois par jour', value: 'twice_daily' },
  { label: '3 fois par jour', value: 'thrice_daily' },
  { label: '2 fois par semaine', value: 'twice_weekly' },
  { label: '3 fois par semaine', value: 'thrice_weekly' },
  { label: 'À voir avec le professionnel', value: 'to_define' },
] as const;
