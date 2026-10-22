import {
  shouldRefreshAppointmentsFromNotifications,
  type NotificationRefreshTracker,
} from '../use-appointments-refresh-on-notifications';

jest.mock('@/features/notifications/hooks/use-notification-polling', () => ({ useNotificationPolling: jest.fn() }));
jest.mock('@/store/auth-store', () => ({ useAuthStore: jest.fn() }));

function tracker(): NotificationRefreshTracker {
  return { initialized: false, seenIds: new Set() };
}

const confirmed = { id: 'n-1', type: 'appointment_confirmed', data: { appointment_id: 'apt-1' } };

describe('shouldRefreshAppointmentsFromNotifications', () => {
  it('rafraîchit à la première notification RDV même si le premier relevé était vide', () => {
    const t = tracker();
    expect(shouldRefreshAppointmentsFromNotifications(t, [])).toBe(false);
    expect(shouldRefreshAppointmentsFromNotifications(t, [confirmed])).toBe(true);
  });

  it('ignore les notifications déjà présentes au premier relevé', () => {
    const t = tracker();
    expect(shouldRefreshAppointmentsFromNotifications(t, [confirmed])).toBe(false);
    expect(shouldRefreshAppointmentsFromNotifications(t, [confirmed])).toBe(false);
  });
});
