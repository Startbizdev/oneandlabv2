import type { Appointment, NurseCollaboration } from '@oneandlab/shared-types';
import {
  buildNurseCollaborationBody,
  canAddCoNurse,
  canReplacePrescriptionDocument,
  canReplacePrescriptionRole,
  coNurseNamesLabel,
  medicalDocumentReplacePath,
  nurseCollaborationPath,
  nurseCollaborationRangeDays,
  nurseCollaborationRowCopy,
  nurseCollaborationScopeOptions,
  nurseCollaborationScopeSummary,
  nurseCollaborationsPath,
  nurseOwnerOnlyActionsVisible,
  nursePickerDisplayName,
  nursePickerSearchPath,
  sharedAppointmentMention,
  tourDateFromParam,
} from '@oneandlab/shared-utils';
import { detailSidebarActionFlags } from '../../features/appointments/detail/utils/detail-sidebar-action-flags';

const collaboration: NurseCollaboration = {
  id: 'c1',
  scope: 'appointment',
  owner_nurse_id: 'owner',
  owner_name: 'Marie Durand',
  co_nurse_id: 'guest',
  co_nurse_name: 'Paul Roy',
  co_nurse_profile_image_url: null,
  appointment_id: 'a1',
  passage_series_id: null,
  start_date: null,
  end_date: null,
  created_at: '2026-10-06 09:00:00',
  can_remove: true,
};

describe('binôme infirmier — portée', () => {
  it('offers only the scopes the screen can target', () => {
    expect(nurseCollaborationScopeOptions({ appointmentId: 'a1', allowRange: false })).toEqual(['appointment']);
    expect(nurseCollaborationScopeOptions({ appointmentId: 'a1', passageSeriesId: 's1', allowRange: false })).toEqual([
      'appointment',
      'series',
    ]);
    expect(nurseCollaborationScopeOptions({})).toEqual(['range']);
  });

  it('counts the days of a period, bounds included', () => {
    expect(nurseCollaborationRangeDays('2026-10-12', '2026-10-12')).toBe(1);
    expect(nurseCollaborationRangeDays('2026-10-01', '2026-12-31')).toBe(92);
    expect(nurseCollaborationRangeDays('2026-10-12', '2026-10-11')).toBeNull();
    expect(nurseCollaborationRangeDays('12/10/2026', '2026-10-12')).toBeNull();
  });

  it('builds the POST body of each scope', () => {
    expect(buildNurseCollaborationBody({ coNurseId: 'guest', scope: 'appointment', appointmentId: 'a1' })).toEqual({
      ok: true,
      body: { co_nurse_id: 'guest', scope: 'appointment', appointment_id: 'a1' },
    });
    expect(buildNurseCollaborationBody({ coNurseId: 'guest', scope: 'series', passageSeriesId: 's1' })).toEqual({
      ok: true,
      body: { co_nurse_id: 'guest', scope: 'series', passage_series_id: 's1' },
    });
    expect(
      buildNurseCollaborationBody({ coNurseId: 'guest', scope: 'range', startDate: '2026-10-12', endDate: '2026-10-20' }),
    ).toEqual({
      ok: true,
      body: { co_nurse_id: 'guest', scope: 'range', start_date: '2026-10-12', end_date: '2026-10-20' },
    });
  });

  it('rejects an incomplete draft or a period over 92 days', () => {
    expect(buildNurseCollaborationBody({ coNurseId: ' ', scope: 'appointment', appointmentId: 'a1' }).ok).toBe(false);
    expect(buildNurseCollaborationBody({ coNurseId: 'guest', scope: 'series' }).ok).toBe(false);
    expect(
      buildNurseCollaborationBody({ coNurseId: 'guest', scope: 'range', startDate: '2026-10-01', endDate: '2027-01-01' }),
    ).toEqual({ ok: false, error: 'Période limitée à 92 jours.' });
  });

  it('summarises the scope of a collaboration', () => {
    expect(nurseCollaborationScopeSummary(collaboration)).toBe('Ce rendez-vous');
    expect(nurseCollaborationScopeSummary({ scope: 'series', start_date: null, end_date: null })).toBe('Toute la série');
    expect(nurseCollaborationScopeSummary({ scope: 'range', start_date: null, end_date: null })).toBe('Une période');
    expect(nurseCollaborationScopeSummary({ scope: 'range', start_date: '2026-10-12', end_date: '2026-10-20' })).toMatch(
      /^Du .+ au .+$/,
    );
  });
});

describe('binôme infirmier — lignes et droits', () => {
  it('shows the co-nurse to the owner and the owner to the guest', () => {
    expect(nurseCollaborationRowCopy(collaboration, 'owner')).toMatchObject({
      guest: false,
      title: 'Paul Roy',
      removeLabel: 'Retirer',
      confirmTitle: 'Retirer Paul Roy ?',
    });
    expect(nurseCollaborationRowCopy(collaboration, 'guest')).toMatchObject({
      guest: true,
      title: 'Partagé par Marie Durand',
      removeLabel: 'Me retirer',
      confirmTitle: 'Vous retirer ?',
    });
    expect(nurseCollaborationRowCopy(collaboration, null).guest).toBe(false);
  });

  it('lets only the assigned owner of an active appointment add a co-nurse', () => {
    const apt = { status: 'confirmed', assigned_nurse_id: 'owner' };
    expect(canAddCoNurse(apt, 'owner')).toBe(true);
    expect(canAddCoNurse(apt, 'guest')).toBe(false);
    expect(canAddCoNurse({ ...apt, is_co_nurse: true }, 'owner')).toBe(false);
    expect(canAddCoNurse({ ...apt, status: 'completed' }, 'owner')).toBe(false);
    expect(canAddCoNurse(apt, null)).toBe(false);
  });

  it('hides the owner actions from the guest', () => {
    expect(nurseOwnerOnlyActionsVisible({ is_co_nurse: true })).toBe(false);
    expect(nurseOwnerOnlyActionsVisible({ is_co_nurse: false })).toBe(true);
    expect(nurseOwnerOnlyActionsVisible(null)).toBe(true);
  });

  it('mentions a shared appointment on agenda rows and tour stops', () => {
    expect(sharedAppointmentMention({ is_co_nurse: true, shared_by_name: 'Nina Infirmiere' })).toBe(
      'Partagé par Nina Infirmiere',
    );
    expect(sharedAppointmentMention({ is_co_nurse: true })).toBe('Partagé avec vous');
    expect(sharedAppointmentMention({ co_nurses: [{ id: 'g', name: 'Paul R.' }] })).toBe('Avec Paul R.');
    expect(sharedAppointmentMention({ co_nurses: [] })).toBe('');
    expect(
      coNurseNamesLabel([
        { id: '1', name: 'Paul R.' },
        { id: '2', name: 'Léa M.' },
        { id: '3', name: 'Tom B.' },
      ]),
    ).toBe('Paul R. et 2 autres');
  });
});

describe('binôme infirmier — API et liens', () => {
  it('builds the collaboration and picker paths', () => {
    expect(nurseCollaborationsPath()).toBe('/nurse/collaborations');
    expect(nurseCollaborationsPath('a 1')).toBe('/nurse/collaborations?appointment_id=a%201');
    expect(nurseCollaborationPath('c1')).toBe('/nurse/collaborations/c1');
    expect(nursePickerSearchPath('Dé')).toBe('/users?role=nurse&scope=picker&limit=20&search=D%C3%A9');
  });

  it('names a picked nurse, falling back to the email', () => {
    expect(nursePickerDisplayName({ id: '1', first_name: 'Paul', last_name: 'Roy' })).toBe('Paul Roy');
    expect(nursePickerDisplayName({ id: '1', email: 'paul@cary.fr' })).toBe('paul@cary.fr');
    expect(nursePickerDisplayName({ id: '1' })).toBe('Infirmier');
  });

  it('reads the tour day of a link', () => {
    expect(tourDateFromParam('2026-10-12')).toBe('2026-10-12');
    expect(tourDateFromParam(['2026-10-12'])).toBe('2026-10-12');
    expect(tourDateFromParam('12/10/2026')).toBeNull();
    expect(tourDateFromParam(undefined)).toBeNull();
  });
});

describe('remplacer une ordonnance', () => {
  it('is reserved to care staff', () => {
    for (const role of ['pro', 'nurse', 'lab', 'subaccount', 'super_admin']) {
      expect(canReplacePrescriptionRole(role)).toBe(true);
    }
    expect(canReplacePrescriptionRole('patient')).toBe(false);
    expect(canReplacePrescriptionRole('preleveur')).toBe(false);
  });

  it('targets an appointment prescription not yet replaced', () => {
    const doc = { id: 'd1', document_type: 'ordonnance' };
    expect(canReplacePrescriptionDocument('nurse', doc)).toBe(true);
    expect(canReplacePrescriptionDocument('nurse', { ...doc, source: 'appointment' })).toBe(true);
    expect(canReplacePrescriptionDocument('nurse', { ...doc, source: 'patient_profile' })).toBe(false);
    expect(canReplacePrescriptionDocument('nurse', { ...doc, document_type: 'carte_vitale' })).toBe(false);
    expect(canReplacePrescriptionDocument('nurse', { ...doc, replaced_by_document_id: 'd2' })).toBe(false);
    expect(canReplacePrescriptionDocument('patient', doc)).toBe(false);
    expect(medicalDocumentReplacePath('d1')).toBe('/medical-documents/d1/replace');
  });
});

describe('actions de la fiche RDV infirmier', () => {
  const owned: Appointment = {
    id: 'a1',
    type: 'nursing',
    status: 'confirmed',
    created_by: 'owner',
    assigned_nurse_id: 'owner',
    created_at: '2026-10-01 09:00:00',
  };

  it('keeps share, redispatch and cancel for the owner', () => {
    expect(detailSidebarActionFlags(owned, { role: 'nurse', viewerId: 'owner' })).toEqual({
      reschedule: true,
      share: true,
      redispatch: true,
      cancel: true,
    });
  });

  it('hides them for the co-nurse', () => {
    const flags = detailSidebarActionFlags({ ...owned, is_co_nurse: true }, { role: 'nurse', viewerId: 'owner' });
    expect(flags).toMatchObject({ share: false, redispatch: false, cancel: false });
  });
});
