export type BookingWizardSection = 'slot-datetime' | 'documents' | 'personal' | 'review';

export type BookingWizardMode = 'patient' | 'dashboard';

const PATIENT_PHASES = ['Soins', 'Créneau', 'Vos infos', 'Vérification'] as const;
const STAFF_PHASES = ['Soins', 'Créneau', 'Patient', 'Vérification'] as const;

/** Phases affichées par le stepper : toujours 4, quels que soient les lots ou documents. */
export function bookingWizardPhases(mode: BookingWizardMode): readonly string[] {
  return mode === 'patient' ? PATIENT_PHASES : STAFF_PHASES;
}

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

/** Index 0-based de la phase courante (choix des soins et laboratoire = phase « Soins »). */
export function bookingWizardPhaseIndex(
  step: number,
  formWizardStep: number,
  section: BookingWizardSection,
): number {
  if (step < formWizardStep) return 0;
  if (section === 'slot-datetime') return 1;
  if (section === 'review') return 3;
  return 2;
}

/** Précision sous le stepper quand une phase contient plusieurs sous-étapes. */
export function bookingWizardSubStepLabel(
  section: BookingWizardSection,
  wizardIndex: number,
  slotCount: number,
  documentsCount: number,
): string {
  if (section === 'slot-datetime') {
    return slotCount > 1 ? `Créneau ${wizardIndex + 1} sur ${slotCount}` : '';
  }
  if (section === 'documents') {
    const docIndex = wizardIndex - slotCount;
    return documentsCount > 1 ? `Documents ${docIndex + 1} sur ${documentsCount}` : 'Documents';
  }
  if (section === 'personal') return 'Coordonnées';
  return '';
}
