import { resolveNotificationNavigation } from '../../features/notifications/utils/notification-navigation';

const received = { pathname: '/(pro)/commandes-recues/[id]', params: { id: 'o1' } };
const sent = { pathname: '/(pro)/commandes-pharmacie/[id]', params: { id: 'o1' } };

function notif(type: string, data: Record<string, unknown> | string) {
  return { id: 'n1', type, data };
}

describe('pharmacy order notification navigation', () => {
  it('opens the received order for the pharmacy when a prescription is added', () => {
    expect(
      resolveNotificationNavigation(notif('pharmacy_order_prescriptions_added', { pharmacy_order_id: 'o1' }), 'pro'),
    ).toEqual(received);
  });

  it('routes a cancellation to the side the recipient is on', () => {
    expect(
      resolveNotificationNavigation(
        notif('pharmacy_order_cancelled', { pharmacy_order_id: 'o1', pharmacy_order_side: 'received' }),
        'pro',
      ),
    ).toEqual(received);
    expect(
      resolveNotificationNavigation(
        notif('pharmacy_order_cancelled', JSON.stringify({ pharmacy_order_id: 'o1', pharmacy_order_side: 'sent' })),
        'pro',
        { pharmacyCanReceive: true },
      ),
    ).toEqual(sent);
  });

  it('falls back to the pharmacy capability when the side is unknown', () => {
    const cancelled = notif('pharmacy_order_cancelled', { pharmacy_order_id: 'o1' });
    expect(resolveNotificationNavigation(cancelled, 'pro', { pharmacyCanReceive: true })).toEqual(received);
    expect(resolveNotificationNavigation(cancelled, 'pro')).toEqual(sent);
  });

  it('opens the patient order detail for a cancellation', () => {
    expect(
      resolveNotificationNavigation(
        notif('pharmacy_order_cancelled', { pharmacy_order_id: 'o1', pharmacy_order_side: 'sent' }),
        'patient',
      ),
    ).toEqual({ pathname: '/(patient)/traitements/[id]', params: { id: 'o1' } });
  });

  it('opens the messages view on the notified message', () => {
    const message = (side: string) =>
      notif('pharmacy_order_message', { pharmacy_order_id: 'o1', message_id: 'm1', pharmacy_order_side: side });
    expect(resolveNotificationNavigation(message('received'), 'pro')).toEqual({
      pathname: '/(pro)/commandes-recues/[id]/messages',
      params: { id: 'o1', messageId: 'm1' },
    });
    expect(resolveNotificationNavigation(message('sent'), 'nurse')).toEqual({
      pathname: '/(nurse)/commandes-pharmacie/[id]/messages',
      params: { id: 'o1', messageId: 'm1' },
    });
    expect(resolveNotificationNavigation(message('sent'), 'patient')).toEqual({
      pathname: '/(patient)/traitements/[id]/messages',
      params: { id: 'o1', messageId: 'm1' },
    });
  });
});

describe('nurse collaboration notification navigation', () => {
  const added = (data: Record<string, unknown>) => notif('nurse_collaboration_added', data);

  it('opens the shared appointment first', () => {
    expect(resolveNotificationNavigation(added({ appointment_id: 'a1', passage_series_id: 's1' }), 'nurse')).toEqual({
      pathname: '/(nurse)/appointment/[id]',
      params: { id: 'a1' },
    });
  });

  it('opens the tour at the start date for a series or a period', () => {
    const tour = { pathname: '/(nurse)/(tabs)/tournee', params: { date: '2026-10-12' } };
    expect(
      resolveNotificationNavigation(added({ passage_series_id: 's1', start_date: '2026-10-12' }), 'nurse'),
    ).toEqual(tour);
    expect(resolveNotificationNavigation(added({ start_date: '2026-10-12 00:00:00' }), 'nurse')).toEqual(tour);
  });

  it('is ignored by the other roles', () => {
    expect(resolveNotificationNavigation(added({ start_date: '2026-10-12' }), 'pro')).toBeNull();
  });
});
