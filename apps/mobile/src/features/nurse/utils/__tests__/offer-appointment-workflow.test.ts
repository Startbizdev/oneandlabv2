import type { Appointment } from '@oneandlab/shared-types';
import { snoozeOfferAppointment } from '@/features/appointments/api/appointments.service';
import { ApiRequestError } from '@/lib/errors/api-request-error';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import { snoozeOfferBatch } from '../offer-appointment-workflow';

jest.mock('@/features/appointments/api/appointments.service', () => ({
  updateAppointment: jest.fn(),
  snoozeOfferAppointment: jest.fn(),
}));

const snooze = jest.mocked(snoozeOfferAppointment);

const row: AppointmentListRow = {
  kind: 'single',
  appointment: { id: 'apt-1', status: 'pending', type: 'nursing', created_by: null } as unknown as Appointment,
};

beforeEach(() => snooze.mockReset());

describe('snoozeOfferBatch', () => {
  it('reporte l’offre', async () => {
    snooze.mockResolvedValue({ success: true } as never);

    await expect(snoozeOfferBatch(row, 'nurse-1')).resolves.toEqual({ ok: true, count: 1 });
    expect(snooze).toHaveBeenCalledWith('apt-1');
  });

  it('renvoie une erreur au lieu de rejeter quand le réseau échoue (la file d’offres continue)', async () => {
    snooze.mockRejectedValue(new ApiRequestError('Connexion impossible', null));

    await expect(snoozeOfferBatch(row, 'nurse-1')).resolves.toEqual({ ok: false, error: 'Connexion impossible' });
  });

  it('signale une offre déjà prise par un confrère (404 du serveur)', async () => {
    snooze.mockRejectedValue(new ApiRequestError('Ce rendez-vous a déjà été accepté', 404));

    await expect(snoozeOfferBatch(row, 'nurse-1')).resolves.toEqual({
      ok: false,
      alreadyTaken: true,
      error: 'Ce rendez-vous a déjà été accepté',
    });
  });
});
