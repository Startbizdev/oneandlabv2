import { bloodTestNeedsLabPreferenceStep, validateLabPreferenceBeforeSubmit } from '@oneandlab/shared-utils';
import {
  isBloodTestOnlyBookingRole,
  isPatientEmailOptionalForBookingRole,
  skipsLabPreferenceStepForBookingRole,
} from '../../features/appointments/form/utils/booking-wizard-role-rules';
import { appointmentsListHref } from '../../navigation/role-hrefs';

const blood = [{ type: 'blood_test' }];

describe('booking wizard role rules', () => {
  it('préleveur books blood tests only, without lab network step', () => {
    expect(isBloodTestOnlyBookingRole('preleveur')).toBe(true);
    expect(skipsLabPreferenceStepForBookingRole('preleveur')).toBe(true);
    expect(
      bloodTestNeedsLabPreferenceStep(blood, {
        skipForProviderBooking: skipsLabPreferenceStepForBookingRole('preleveur'),
      }),
    ).toBe(false);
    expect(
      validateLabPreferenceBeforeSubmit(blood, '', null, {
        skipForProviderBooking: skipsLabPreferenceStepForBookingRole('preleveur'),
      }),
    ).toBeNull();
  });

  it('other staff roles keep the lab network step and full catalogue', () => {
    for (const role of ['pro', 'nurse', 'lab', 'subaccount', 'patient']) {
      expect(isBloodTestOnlyBookingRole(role)).toBe(false);
      expect(skipsLabPreferenceStepForBookingRole(role)).toBe(false);
      expect(
        bloodTestNeedsLabPreferenceStep(blood, {
          skipForProviderBooking: skipsLabPreferenceStepForBookingRole(role),
        }),
      ).toBe(true);
    }
  });

  it('patient email is optional for nurse, pro and préleveur only', () => {
    expect(isPatientEmailOptionalForBookingRole('nurse')).toBe(true);
    expect(isPatientEmailOptionalForBookingRole('pro')).toBe(true);
    expect(isPatientEmailOptionalForBookingRole('preleveur')).toBe(true);
    expect(isPatientEmailOptionalForBookingRole('lab')).toBe(false);
    expect(isPatientEmailOptionalForBookingRole('patient')).toBe(false);
  });

  it('fallback list route exists for each dashboard role', () => {
    expect(appointmentsListHref('/(preleveur)')).toBe('/(preleveur)/(tabs)');
    expect(appointmentsListHref('/(pro)')).toBe('/(pro)/(tabs)/appointments');
    expect(appointmentsListHref('/(nurse)')).toBe('/(nurse)/(tabs)/appointments');
  });
});
