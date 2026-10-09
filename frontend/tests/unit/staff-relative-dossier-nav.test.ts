import { describe, expect, it } from 'vitest';
import type { StaffHubDocumentItem, StaffHubRelativeItem } from '@oneandlab/shared-types';
import { staffHubItemHref } from '~/utils/staff-patient-hub-nav';
import { staffAppointmentPatientProfileHref } from '~/utils/staff-appointment-patient-profile';

const relativeItem: StaffHubRelativeItem = {
  kind: 'relative',
  id: 'relative:r1',
  relative_id: 'r1',
  patient_id: 'holder1',
  profile_id: 'jean-profile',
  relative_name: 'Jean Martin',
  patient_name: 'Alice Martin',
};

describe('hub patients staff : proches', () => {
  it('ouvre le dossier propre du proche', () => {
    expect(staffHubItemHref(relativeItem, '/pro')).toBe('/profile?userId=jean-profile');
  });

  it('passe par le titulaire tant que le proche n’a pas de dossier', () => {
    expect(staffHubItemHref({ ...relativeItem, profile_id: null }, '/pro')).toBe(
      '/profile?userId=holder1&relativeId=r1',
    );
  });

  it('ouvre un document sur le dossier qui le porte', () => {
    const doc: StaffHubDocumentItem = {
      kind: 'document',
      id: 'document:d1',
      patient_id: 'jean-profile',
      patient_name: 'Jean Martin',
      document_type: 'carte_vitale',
      title: 'Carte Vitale',
      source: 'relative',
      relative_id: 'r1',
    };
    expect(staffHubItemHref(doc, '/nurse')).toBe('/profile?userId=jean-profile');
  });
});

describe('dossier patient depuis un rendez-vous', () => {
  it('ouvre le dossier du titulaire pour son propre rendez-vous', () => {
    expect(staffAppointmentPatientProfileHref('nurse', { patient_id: 'alice' })).toBe('/profile?userId=alice');
  });

  it('ouvre le dossier du proche pour un rendez-vous pris pour lui', () => {
    expect(
      staffAppointmentPatientProfileHref('pro', {
        patient_id: 'alice',
        relative_id: 'r1',
        relative_profile_id: 'jean-profile',
      }),
    ).toBe('/profile?userId=jean-profile');
  });

  it('ne retombe jamais sur la seule fiche du titulaire pour un proche sans dossier connu', () => {
    expect(staffAppointmentPatientProfileHref('pro', { patient_id: 'alice', relative: { id: 'r1' } })).toBe(
      '/profile?userId=alice&relativeId=r1',
    );
  });

  it('reste réservé au staff', () => {
    expect(staffAppointmentPatientProfileHref('patient', { patient_id: 'alice' })).toBeNull();
    expect(staffAppointmentPatientProfileHref('pro', null)).toBeNull();
  });
});
