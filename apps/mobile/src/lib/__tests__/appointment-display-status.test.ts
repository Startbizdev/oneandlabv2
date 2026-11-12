import type { Appointment } from '@oneandlab/shared-types';
import { STATUS_LABELS } from '@oneandlab/shared-utils';
import { appointmentStatusForDisplay } from '../../utils/effective-appointment-status';

const PRO = 'pro-1';
const apt = (over: Partial<Appointment> & { assigned_pro_id?: string | null }) =>
  ({ id: 'a', type: 'nursing', status: 'pending', created_by: 'patient-1', ...over }) as Appointment;

describe('appointmentStatusForDisplay — RDV adressé par un pro (QR)', () => {
  it('affiche « Transmis » au pro destinataire tant que personne n’a accepté', () => {
    const status = appointmentStatusForDisplay(apt({ assigned_pro_id: PRO }), { role: 'pro', viewerId: PRO });
    expect(status).toBe('referred');
    expect(STATUS_LABELS[status]).toBe('Transmis');
  });

  it('garde le vrai statut une fois accepté, pour un autre pro et pour le créateur', () => {
    expect(appointmentStatusForDisplay(apt({ assigned_pro_id: PRO, status: 'confirmed' }), { role: 'pro', viewerId: PRO })).toBe('confirmed');
    expect(appointmentStatusForDisplay(apt({ assigned_pro_id: PRO }), { role: 'pro', viewerId: 'pro-2' })).toBe('pending');
    expect(appointmentStatusForDisplay(apt({ assigned_pro_id: PRO, created_by: PRO }), { role: 'pro', viewerId: PRO })).toBe('pending');
    expect(appointmentStatusForDisplay(apt({ assigned_pro_id: PRO }), { role: 'patient', viewerId: 'patient-1' })).toBe('pending');
  });
});
