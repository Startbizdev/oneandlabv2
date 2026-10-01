import {
  bookingWizardProgress,
  type BookingWizardProgressInput,
} from '../../features/appointments/form/utils/booking-wizard-steps';

const patientBloodTest: Omit<BookingWizardProgressInput, 'step' | 'wizardIndex'> = {
  mode: 'patient',
  hasLabStep: true,
  slotCount: 1,
  documentsCount: 1,
};

describe('bookingWizardProgress', () => {
  it('numbers each displayed patient screen once (soins, laboratoire, créneau, documents, infos, vérification)', () => {
    const screens = [
      { step: 0, wizardIndex: 0 },
      { step: 1, wizardIndex: 0 },
      { step: 2, wizardIndex: 0 },
      { step: 2, wizardIndex: 1 },
      { step: 2, wizardIndex: 2 },
      { step: 2, wizardIndex: 3 },
    ].map((position) => bookingWizardProgress({ ...patientBloodTest, ...position }));

    expect(screens.map((s) => s.current)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(screens.map((s) => s.label)).toEqual([
      'Soins',
      'Laboratoire',
      'Créneau',
      'Documents',
      'Vos infos',
      'Vérification',
    ]);
    for (const s of screens) expect(s.phases).toHaveLength(6);
  });

  it('omits the lab and documents steps when the selection does not show them', () => {
    const base = { mode: 'patient', hasLabStep: false, slotCount: 1, documentsCount: 0 } as const;
    expect(bookingWizardProgress({ ...base, step: 0, wizardIndex: 0 })).toEqual({
      phases: ['Soins', 'Créneau', 'Vos infos', 'Vérification'],
      current: 1,
      label: 'Soins',
    });
    expect(bookingWizardProgress({ ...base, step: 1, wizardIndex: 0 }).current).toBe(2);
    expect(bookingWizardProgress({ ...base, step: 1, wizardIndex: 1 }).current).toBe(3);
    expect(bookingWizardProgress({ ...base, step: 1, wizardIndex: 2 }).current).toBe(4);
  });

  it('uses the staff wording for the patient step', () => {
    const progress = bookingWizardProgress({
      mode: 'dashboard',
      hasLabStep: false,
      slotCount: 1,
      documentsCount: 1,
      step: 1,
      wizardIndex: 2,
    });
    expect(progress.phases).toEqual(['Soins', 'Créneau', 'Documents', 'Patient', 'Vérification']);
    expect(progress).toMatchObject({ current: 4, label: 'Patient' });
  });

  it('keeps several slots or prescriptions inside a single step', () => {
    const base = { mode: 'patient', hasLabStep: false, slotCount: 2, documentsCount: 2, step: 1 } as const;
    expect(bookingWizardProgress({ ...base, wizardIndex: 1 })).toMatchObject({
      current: 2,
      label: 'Créneau 2 sur 2',
    });
    expect(bookingWizardProgress({ ...base, wizardIndex: 2 })).toMatchObject({
      current: 3,
      label: 'Documents 1 sur 2',
    });
    expect(bookingWizardProgress({ ...base, wizardIndex: 4 })).toMatchObject({ current: 4, label: 'Vos infos' });
  });
});
