import { appointmentDossierPatientId } from '@oneandlab/shared-utils';

describe('appointmentDossierPatientId', () => {
  it('targets the account holder for their own appointment', () => {
    expect(appointmentDossierPatientId({ patient_id: 'alice', relative_id: null })).toBe('alice');
  });

  it('targets the relative file for an appointment booked for a relative', () => {
    expect(
      appointmentDossierPatientId({ patient_id: 'alice', relative_id: 'r1', relative_profile_id: 'jean' }),
    ).toBe('jean');
    expect(
      appointmentDossierPatientId({ patient_id: 'alice', relative: { id: 'r1', profile_id: 'jean' } }),
    ).toBe('jean');
  });

  it('never falls back to the holder when the relative has no file yet', () => {
    expect(appointmentDossierPatientId({ patient_id: 'alice', relative_id: 'r1' })).toBeNull();
    expect(
      appointmentDossierPatientId({ patient_id: 'alice', relative: { id: 'r1', profile_id: ' ' } }),
    ).toBeNull();
  });

  it('handles a missing appointment or patient', () => {
    expect(appointmentDossierPatientId(null)).toBeNull();
    expect(appointmentDossierPatientId({ patient_id: '  ' })).toBeNull();
  });
});
