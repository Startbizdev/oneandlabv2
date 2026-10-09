import {
  applyDirectedProviderToPayloads,
  directedProviderAppointmentTypes,
  directedProviderAssignmentField,
  directedProviderTypeForRole,
  resolveDirectedProvider,
} from '@oneandlab/shared-utils';
import { skipsLabPreferenceStep } from '../../features/appointments/form/utils/booking-wizard-role-rules';
import { bookingNewHref } from '../../navigation/role-hrefs';

const NURSE_ID = '00000000-0000-4000-8000-00000000b001';

describe('directed provider booking', () => {
  it('maps bookable profile roles only', () => {
    expect(directedProviderTypeForRole('nurse')).toBe('nurse');
    expect(directedProviderTypeForRole('lab')).toBe('lab');
    expect(directedProviderTypeForRole('subaccount')).toBe('lab');
    expect(directedProviderTypeForRole('pro')).toBe('pro');
    for (const role of ['preleveur', 'patient', 'super_admin', '', null, undefined]) {
      expect(directedProviderTypeForRole(role)).toBeNull();
    }
  });

  it('resolves route params, ignoring a missing id or an unknown role', () => {
    expect(resolveDirectedProvider(` ${NURSE_ID} `, 'nurse')).toEqual({ id: NURSE_ID, type: 'nurse' });
    expect(resolveDirectedProvider('', 'nurse')).toBeNull();
    expect(resolveDirectedProvider(NURSE_ID, 'preleveur')).toBeNull();
  });

  it('constrains care types like GET /categories?provider_id=', () => {
    expect(directedProviderAppointmentTypes('nurse')).toEqual(['nursing']);
    expect(directedProviderAppointmentTypes('lab')).toEqual(['blood_test']);
    expect(directedProviderAppointmentTypes('pro')).toEqual(['nursing', 'blood_test']);
  });

  it('picks the assignment field checked by AppointmentCreateInputPolicy', () => {
    expect(directedProviderAssignmentField('nurse', 'nursing')).toBe('assigned_nurse_id');
    expect(directedProviderAssignmentField('nurse', 'blood_test')).toBeNull();
    expect(directedProviderAssignmentField('lab', 'blood_test')).toBe('assigned_lab_id');
    expect(directedProviderAssignmentField('lab', 'nursing')).toBeNull();
    expect(directedProviderAssignmentField('pro', 'nursing')).toBe('assigned_pro_id');
    expect(directedProviderAssignmentField('pro', 'blood_test')).toBe('assigned_pro_id');
  });

  it('adds the provider to matching payloads without mutating them', () => {
    const payloads = [
      { type: 'nursing', category_id: 1 },
      { type: 'blood_test', category_id: 2 },
    ];
    const result = applyDirectedProviderToPayloads(payloads, { id: NURSE_ID, type: 'nurse' });
    expect(result).toEqual([
      { type: 'nursing', category_id: 1, assigned_nurse_id: NURSE_ID },
      { type: 'blood_test', category_id: 2 },
    ]);
    expect(payloads[0]).not.toHaveProperty('assigned_nurse_id');
    expect(applyDirectedProviderToPayloads(payloads, null)).toBe(payloads);
  });

  it('skips the lab network step only when the lab is already chosen', () => {
    expect(skipsLabPreferenceStep('patient', { id: 'lab-1', type: 'lab' })).toBe(true);
    expect(skipsLabPreferenceStep('patient', { id: 'pro-1', type: 'pro' })).toBe(false);
    expect(skipsLabPreferenceStep('patient', null)).toBe(false);
    expect(skipsLabPreferenceStep('preleveur', null)).toBe(true);
  });

  it('opens the patient booking with the provider route params', () => {
    expect(bookingNewHref('/(patient)', { provider_id: NURSE_ID, provider_role: 'nurse' })).toEqual({
      pathname: '/(patient)/booking/new',
      params: { provider_id: NURSE_ID, provider_role: 'nurse' },
    });
  });
});
