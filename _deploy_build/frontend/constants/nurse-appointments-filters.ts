/** Filtres liste infirmier ↔ API `nurse_tab` / `nurse_segment` (GET /appointments). */
export type NurseListTab = 'soins' | 'demandes';
export type NurseSegment =
  | 'tous'
  | 'acceptes'
  | 'en_attente'
  | 'envoyes'
  /** @deprecated alias → en_attente */
  | 'offres'
  /** @deprecated alias → acceptes */
  | 'tour'
  | 'historique'
  | 'relais';

export const NURSE_TAB_OPTIONS: Array<{
  label: string;
  value: NurseListTab;
  icon: string;
  hint: string;
}> = [
  {
    label: 'Mes soins',
    value: 'soins',
    icon: 'i-lucide-stethoscope',
    hint: 'Filtrez par vue : acceptés, en attente, envoyés au labo, relais…',
  },
  {
    label: 'Bilans sanguins',
    value: 'demandes',
    icon: 'i-lucide-droplet',
    hint: 'Prises de sang que vous avez créées pour un patient (équivalent onglet Soins envoyés).',
  },
];

export const NURSE_SEGMENT_OPTIONS: Array<{
  value: NurseSegment;
  label: string;
  sub: string;
  hint: string;
}> = [
  {
    value: 'tous',
    label: 'Tout afficher',
    sub: 'Vue complète',
    hint: 'Tous les rendez-vous qui vous concernent (soins + créations).',
  },
  {
    value: 'acceptes',
    label: 'Soins acceptés',
    sub: 'À votre charge',
    hint: 'Soins confirmés, en cours ou terminés dont vous assurez le suivi.',
  },
  {
    value: 'en_attente',
    label: 'Soins en attente',
    sub: 'Nouvelles demandes',
    hint: 'Demandes en attente où vous êtes proposé — acceptez ou refusez depuis la liste.',
  },
  {
    value: 'envoyes',
    label: 'Soins envoyés',
    sub: 'Vers le labo',
    hint: 'Prises de sang que vous avez créées pour le laboratoire.',
  },
  {
    value: 'historique',
    label: 'Historique',
    sub: 'Terminés / annulés',
    hint: 'Soins terminés, annulés ou refusés (pour vous).',
  },
  {
    value: 'relais',
    label: 'Relais',
    sub: 'Créés par vous',
    hint: 'Soins créés pour un patient et encore à prendre en charge par un confrère.',
  },
];

export function isValidNurseSegment(s: string): s is NurseSegment {
  return [
    'tous',
    'acceptes',
    'en_attente',
    'envoyes',
    'offres',
    'tour',
    'historique',
    'relais',
  ].includes(s);
}

/** Normalise les anciens noms d’URL vers les segments actuels. */
export function normalizeNurseSegment(raw: string): NurseSegment {
  if (raw === 'offres') return 'en_attente';
  if (raw === 'tour') return 'acceptes';
  /** Ancien segment « Dispatches » : fusionné dans les autres vues ; les RDV redispatchés ne sont plus listés. */
  if (raw === 'dispatches') return 'tous';
  if (isValidNurseSegment(raw)) return raw;
  return 'tous';
}
