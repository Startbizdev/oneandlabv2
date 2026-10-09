import type { StaffHubDocumentItem, StaffHubRelativeItem } from '@oneandlab/shared-types';
import { staffPatientHref } from '../../navigation/role-hrefs';
import { routeRelativeId, staffHubItemRoute } from '../../features/patients/utils/staff-hub-navigation';
import { createPatientBody } from '../../features/patients/utils/create-patient-body';

const relativeItem: StaffHubRelativeItem = {
  kind: 'relative',
  id: 'relative:r1',
  relative_id: 'r1',
  patient_id: 'holder1',
  profile_id: 'lea-profile',
  relative_name: 'Léa Martin',
  patient_name: 'Alice Martin',
};

describe('staff relative navigation', () => {
  it('opens the relative own patient file from the hub, never the account holder file', () => {
    expect(staffHubItemRoute(relativeItem, 'nurse')).toEqual({
      pathname: '/(nurse)/patient/[id]',
      params: { id: 'lea-profile' },
    });
    expect(staffHubItemRoute(relativeItem, 'pro')).toEqual(staffPatientHref('/(pro)', 'lea-profile'));
  });

  it('lets the patient file resolve the relative file when the hub has no profile id', () => {
    expect(staffHubItemRoute({ ...relativeItem, profile_id: null }, 'pro')).toEqual(
      staffPatientHref('/(pro)', 'holder1', undefined, { relative_id: 'r1' }),
    );
  });

  it('opens documents on the file that owns them', () => {
    const doc: StaffHubDocumentItem = {
      kind: 'document',
      id: 'document:d1',
      patient_id: 'lea-profile',
      patient_name: 'Léa Martin',
      document_type: 'carte_vitale',
      title: 'Carte Vitale',
      source: 'relative',
      relative_id: 'r1',
      relative_name: 'Léa Martin',
    };
    expect(staffHubItemRoute(doc, 'nurse')).toEqual(staffPatientHref('/(nurse)', 'lea-profile', 'documents'));
    expect(
      staffHubItemRoute({ ...doc, patient_id: 'holder1', source: 'profile', relative_id: null }, 'pro'),
    ).toEqual(staffPatientHref('/(pro)', 'holder1', 'documents'));
  });

  it('reads the relative targeted by a legacy holder link', () => {
    expect(routeRelativeId('r1')).toBe('r1');
    expect(routeRelativeId(['r2', 'r3'])).toBe('r2');
    expect(routeRelativeId('  ')).toBeNull();
    expect(routeRelativeId(undefined)).toBeNull();
  });

  it('builds the new patient body without empty fields', () => {
    expect(
      createPatientBody({
        firstName: ' Léa ',
        lastName: 'Martin',
        phone: '',
        email: ' lea@test.invalid ',
        address: { label: '1 rue de la Paix', lat: 48.86, lng: 2.33, city: 'Paris' },
        addressComplement: ' 2e étage ',
      }),
    ).toEqual({
      first_name: 'Léa',
      last_name: 'Martin',
      email: 'lea@test.invalid',
      address: { label: '1 rue de la Paix', lat: 48.86, lng: 2.33, city: 'Paris', complement: '2e étage' },
      patient_booking_consent: true,
    });
  });
});
