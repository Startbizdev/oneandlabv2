export type BookingWizardSection = 'slot-datetime' | 'documents' | 'personal' | 'review';

export type BookingWizardMode = 'patient' | 'dashboard';

type BookingWizardPhase = 'care' | 'lab' | 'slot' | 'documents' | 'personal' | 'review';

const PHASE_LABELS: Record<BookingWizardMode, Record<BookingWizardPhase, string>> = {
  patient: {
    care: 'Soins',
    lab: 'Laboratoire',
    slot: 'Créneau',
    documents: 'Documents',
    personal: 'Vos infos',
    review: 'Vérification',
  },
  dashboard: {
    care: 'Soins',
    lab: 'Laboratoire',
    slot: 'Créneau',
    documents: 'Documents',
    personal: 'Patient',
    review: 'Vérification',
  },
};

export function bookingWizardPersonalIndex(slotCount: number, documentsCount: number): number {
  return slotCount + documentsCount;
}

export function bookingWizardReviewIndex(slotCount: number, documentsCount: number): number {
  return bookingWizardPersonalIndex(slotCount, documentsCount) + 1;
}

export function bookingWizardSectionAt(
  wizardIndex: number,
  slotCount: number,
  documentsCount: number,
): BookingWizardSection {
  const personalIndex = bookingWizardPersonalIndex(slotCount, documentsCount);
  if (wizardIndex < slotCount) return 'slot-datetime';
  if (wizardIndex < personalIndex) return 'documents';
  if (wizardIndex === personalIndex) return 'personal';
  return 'review';
}

const SECTION_PHASE: Record<BookingWizardSection, BookingWizardPhase> = {
  'slot-datetime': 'slot',
  documents: 'documents',
  personal: 'personal',
  review: 'review',
};

export type BookingWizardProgressInput = {
  mode: BookingWizardMode;
  /** Écran « Votre laboratoire » affiché entre les soins et les créneaux. */
  hasLabStep: boolean;
  slotCount: number;
  /** Soins dont l'ordonnance est demandée (0 = pas d'écran Documents). */
  documentsCount: number;
  /** 0 = choix des soins, 1 = laboratoire si `hasLabStep`, puis formulaire. */
  step: number;
  wizardIndex: number;
};

export type BookingWizardProgressState = {
  /** Écrans réellement parcourus pour cette sélection et ce rôle. */
  phases: readonly string[];
  /** Position courante, à partir de 1. */
  current: number;
  label: string;
};

/**
 * Numérotation du stepper : une étape par écran affiché (laboratoire et documents seulement
 * s'ils existent pour la sélection). Plusieurs créneaux ou ordonnances restent une seule étape.
 */
export function bookingWizardProgress(input: BookingWizardProgressInput): BookingWizardProgressState {
  const { mode, hasLabStep, slotCount, documentsCount, step, wizardIndex } = input;
  const keys: BookingWizardPhase[] = [
    'care',
    ...(hasLabStep ? (['lab'] as const) : []),
    'slot',
    ...(documentsCount > 0 ? (['documents'] as const) : []),
    'personal',
    'review',
  ];
  const formStep = hasLabStep ? 2 : 1;
  const section = bookingWizardSectionAt(wizardIndex, slotCount, documentsCount);
  const phase: BookingWizardPhase =
    step === 0 ? 'care' : step < formStep ? 'lab' : SECTION_PHASE[section];
  const labels = PHASE_LABELS[mode];

  let label = labels[phase];
  if (phase === 'slot' && slotCount > 1) {
    label = `${labels.slot} ${wizardIndex + 1} sur ${slotCount}`;
  } else if (phase === 'documents' && documentsCount > 1) {
    label = `${labels.documents} ${wizardIndex - slotCount + 1} sur ${documentsCount}`;
  }

  return { phases: keys.map((key) => labels[key]), current: keys.indexOf(phase) + 1, label };
}
