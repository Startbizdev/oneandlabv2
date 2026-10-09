import { resolveNotificationNavigation } from '../../features/notifications/utils/notification-navigation';

function notif(type: string, data: Record<string, unknown> | string) {
  return { id: 'n1', type, data };
}

const transmission = { patient_id: 'p1', transmission_id: 't1', occurred_on: '2026-10-06' };

describe('care team notification navigation', () => {
  it('opens the transmissions feed of the patient for the nurse and the doctor', () => {
    expect(resolveNotificationNavigation(notif('patient_transmission', transmission), 'nurse')).toEqual({
      pathname: '/(nurse)/patient/[id]/transmissions',
      params: { id: 'p1' },
    });
    expect(
      resolveNotificationNavigation(notif('patient_transmission_for_doctor', JSON.stringify(transmission)), 'pro'),
    ).toEqual({ pathname: '/(pro)/patient/[id]/transmissions', params: { id: 'p1' } });
  });

  it('never opens transmissions for a patient, nor without patient', () => {
    expect(resolveNotificationNavigation(notif('patient_transmission', transmission), 'patient')).toBeNull();
    expect(resolveNotificationNavigation(notif('patient_transmission', { transmission_id: 't1' }), 'nurse')).toBeNull();
  });
});
