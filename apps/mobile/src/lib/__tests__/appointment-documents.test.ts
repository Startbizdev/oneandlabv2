import type { Appointment } from '@oneandlab/shared-types';
import { appointmentDocumentsRowHint, appointmentDocumentsRowVisible } from '@oneandlab/shared-utils';
import type { MedicalDocumentRow } from '../../features/appointments/detail/api/appointment-detail.service';
import {
  appointmentDocumentsOmitCarePhotos,
  appointmentListDocuments,
} from '../../features/appointments/detail/utils/appointment-documents-list';
import { appointmentDocumentsRow } from '../../features/appointments/detail/utils/appointment-documents-row';
import { resolveNotificationNavigation } from '../../features/notifications/utils/notification-navigation';
import { appointmentDocumentsHref } from '../../navigation/role-hrefs';
import { nursePassageDocumentsHref } from '../../features/tournee-nurse/utils/passage-detail-href';

function appointment(overrides: Partial<Appointment>): Appointment {
  return {
    id: 'a1',
    type: 'blood_test',
    form_type: 'blood_test',
    status: 'confirmed',
    address: '',
    scheduled_at: '2026-10-06T08:00:00Z',
    created_at: '2026-10-01T08:00:00Z',
    updated_at: '2026-10-01T08:00:00Z',
    ...overrides,
  };
}

const proNursing = { ...appointment({ type: 'nursing', form_type: 'nursing' }), created_by_role: 'pro' };

function doc(id: string, document_type: string): MedicalDocumentRow {
  return { id, document_type };
}

const docs = [doc('d1', 'ordonnance'), doc('d2', 'care_photo'), doc('d3', 'cancellation_photo')];

describe('appointment documents view', () => {
  it('opens the dedicated documents view of every role', () => {
    expect(appointmentDocumentsHref('/(nurse)', 'a1')).toEqual({
      pathname: '/(nurse)/appointment/[id]/documents',
      params: { id: 'a1' },
    });
    expect(appointmentDocumentsHref('/(pro)', 'a1')).toEqual({
      pathname: '/(pro)/appointment/[id]/documents',
      params: { id: 'a1' },
    });
    expect(appointmentDocumentsHref('/(preleveur)', 'a1')).toEqual({
      pathname: '/(preleveur)/appointment/[id]/documents',
      params: { id: 'a1' },
    });
    expect(appointmentDocumentsHref('/(patient)', 'a1')).toEqual({
      pathname: '/(patient)/appointment/[id]/documents',
      params: { id: 'a1' },
    });
  });

  it('opens the documents of a passage, alone or in a series', () => {
    expect(nursePassageDocumentsHref('s1', 'a1')).toEqual({
      pathname: '/(nurse)/passage/[seriesId]/documents',
      params: { seriesId: 's1', appointment_id: 'a1' },
    });
    expect(nursePassageDocumentsHref('', 'a1')).toEqual({
      pathname: '/(nurse)/passage/[seriesId]/documents',
      params: { seriesId: 'rdv', appointment_id: 'a1' },
    });
  });

  it('opens the appointment itself from a notification, never a removed documents tab', () => {
    expect(resolveNotificationNavigation({ id: 'n1', type: 'appointment_confirmed', appointment_id: 'a1' }, 'patient')).toEqual({
      pathname: '/(patient)/appointment/[id]',
      params: { id: 'a1' },
    });
  });

  it('lists the same documents on the detail row and in the view', () => {
    expect(appointmentListDocuments(docs, 'patient', true).map((d) => d.id)).toEqual(['d1']);
    expect(appointmentListDocuments(docs, 'preleveur', false).map((d) => d.id)).toEqual(['d1', 'd2', 'd3']);
    expect(appointmentListDocuments(docs, 'pro', true).map((d) => d.id)).toEqual(['d1', 'd3']);
  });

  it('moves care photos out of the list only where the care follow-up shows them', () => {
    expect(appointmentDocumentsOmitCarePhotos('patient', appointment({}))).toBe(true);
    expect(appointmentDocumentsOmitCarePhotos('pro', proNursing)).toBe(true);
    expect(appointmentDocumentsOmitCarePhotos('nurse', appointment({}))).toBe(false);
    expect(appointmentDocumentsOmitCarePhotos('preleveur', proNursing)).toBe(false);
  });
});

describe('documents row of a detail', () => {
  const onPress = jest.fn();

  it('stays visible without document while one can still be added, and flags the missing prescription', () => {
    expect(
      appointmentDocumentsRow({ documents: [], loading: false, failed: false, appointmentStatus: 'pending', onPress }),
    ).toMatchObject({ label: 'Documents', value: undefined, description: 'Ordonnance à ajouter', onPress });
  });

  it('shows the count and no hint once the prescription is attached', () => {
    expect(
      appointmentDocumentsRow({
        documents: [doc('d1', 'ordonnance'), doc('d4', 'carte_vitale')],
        loading: false,
        failed: false,
        appointmentStatus: 'completed',
        onPress,
      }),
    ).toMatchObject({ value: '2', description: undefined });
  });

  it('hides the row of a closed appointment without document', () => {
    expect(
      appointmentDocumentsRow({ documents: [], loading: false, failed: false, appointmentStatus: 'canceled', onPress }),
    ).toBeNull();
    expect(appointmentDocumentsRowVisible(1, false)).toBe(true);
  });

  it('keeps the row reachable while loading or after a failure, without a premature hint', () => {
    expect(
      appointmentDocumentsRow({ documents: [], loading: true, failed: false, appointmentStatus: 'canceled', onPress }),
    ).toMatchObject({ description: undefined });
    expect(
      appointmentDocumentsRow({ documents: [], loading: false, failed: true, appointmentStatus: 'pending', onPress }),
    ).toMatchObject({ description: undefined });
  });

  it('never asks for a prescription once documents are locked', () => {
    expect(appointmentDocumentsRowHint([], false)).toBeUndefined();
    expect(appointmentDocumentsRowHint([{ document_type: 'carte_vitale' }], true)).toBe('Ordonnance à ajouter');
  });
});
