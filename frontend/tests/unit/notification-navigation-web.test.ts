import { describe, it, expect } from 'vitest';
import { webNotificationRoute } from '~/utils/notification-navigation-web';

function notif(type: string, data: Record<string, unknown> | string) {
  return { type, data };
}

describe('webNotificationRoute — commandes pharmacie', () => {
  it('opens the received order for the pharmacy (new order, prescription added)', () => {
    expect(webNotificationRoute(notif('pharmacy_order_created', { pharmacy_order_id: 'o1' }), 'pro')).toBe(
      '/pro/commandes-recues/o1',
    );
    expect(
      webNotificationRoute(
        notif('pharmacy_order_prescriptions_added', { pharmacy_order_id: 'o1', pharmacy_order_side: 'received' }),
        'pro',
      ),
    ).toBe('/pro/commandes-recues/o1');
  });

  it('routes a cancellation or a message to the side the recipient is on', () => {
    expect(
      webNotificationRoute(
        notif('pharmacy_order_cancelled', { pharmacy_order_id: 'o1', pharmacy_order_side: 'received' }),
        'pro',
      ),
    ).toBe('/pro/commandes-recues/o1');
    expect(
      webNotificationRoute(
        notif('pharmacy_order_cancelled', JSON.stringify({ pharmacy_order_id: 'o1', pharmacy_order_side: 'sent' })),
        'pro',
      ),
    ).toBe('/pro/commandes-pharmacie/o1');
  });

  it('opens the messages of the order on the message', () => {
    const message = (side: string) =>
      notif('pharmacy_order_message', { pharmacy_order_id: 'o1', message_id: 'm1', pharmacy_order_side: side });
    expect(webNotificationRoute(message('received'), 'pro')).toEqual({
      path: '/pro/commandes-recues/o1/messages',
      query: { message: 'm1' },
    });
    expect(webNotificationRoute(message('sent'), 'nurse')).toEqual({
      path: '/nurse/commandes-pharmacie/o1/messages',
      query: { message: 'm1' },
    });
    expect(webNotificationRoute(message('sent'), 'patient')).toEqual({
      path: '/patient/traitements/o1/messages',
      query: { message: 'm1' },
    });
  });

  it('keeps requester status updates on the sent orders, even without side', () => {
    expect(webNotificationRoute(notif('pharmacy_order_accepted', { pharmacy_order_id: 'o1' }), 'pro')).toBe(
      '/pro/commandes-pharmacie/o1',
    );
    expect(webNotificationRoute(notif('pharmacy_order_cancelled', { pharmacy_order_id: 'o1' }), 'pro')).toBe(
      '/pro/commandes-pharmacie/o1',
    );
  });

  it('opens the order page of the other roles', () => {
    const cancelled = notif('pharmacy_order_cancelled', { pharmacy_order_id: 'o1', pharmacy_order_side: 'sent' });
    expect(webNotificationRoute(cancelled, 'patient')).toBe('/patient/traitements/o1');
    expect(webNotificationRoute(cancelled, 'nurse')).toBe('/nurse/commandes-pharmacie/o1');
    expect(webNotificationRoute(cancelled, 'super_admin')).toBe('/admin/commandes-pharmacie/o1');
    expect(webNotificationRoute(cancelled, 'lab')).toBeNull();
  });
});

describe('webNotificationRoute — binôme infirmier', () => {
  it('opens the shared appointment first', () => {
    const added = notif('nurse_collaboration_added', { appointment_id: 'a1', passage_series_id: 's1' });
    expect(webNotificationRoute(added, 'nurse')).toBe('/nurse/appointments/a1');
  });

  it('opens the series, then the tour at the start date', () => {
    expect(
      webNotificationRoute(notif('nurse_collaboration_added', { passage_series_id: 's1' }), 'nurse'),
    ).toBe('/nurse/passage/s1');
    expect(
      webNotificationRoute(notif('nurse_collaboration_added', { start_date: '2026-10-12' }), 'nurse'),
    ).toEqual({ path: '/nurse/tournee', query: { date: '2026-10-12' } });
    expect(webNotificationRoute(notif('nurse_collaboration_added', {}), 'nurse')).toBe('/nurse/tournee');
  });

  it('ignores the notification for other roles', () => {
    expect(webNotificationRoute(notif('nurse_collaboration_added', { start_date: '2026-10-12' }), 'pro')).toBeNull();
  });
});

describe('webNotificationRoute — transmissions', () => {
  const transmission = { patient_id: 'p1', transmission_id: 't1', occurred_on: '2026-10-06' };

  it('opens the transmissions of the patient file for the care team', () => {
    const expected = { path: '/profile', query: { userId: 'p1' }, hash: '#patient-transmissions' };
    expect(webNotificationRoute(notif('patient_transmission', transmission), 'nurse')).toEqual(expected);
    expect(webNotificationRoute(notif('patient_transmission_for_doctor', transmission), 'pro')).toEqual(expected);
    expect(webNotificationRoute(notif('patient_transmission', transmission), 'patient')).toBeNull();
  });
});
