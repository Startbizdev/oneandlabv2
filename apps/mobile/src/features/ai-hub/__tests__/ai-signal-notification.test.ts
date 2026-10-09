import { resolveNotificationNavigation } from '@/features/notifications/utils/notification-navigation';
import { appointmentDetailHref } from '@/navigation/role-hrefs';

/** Données posées par `AiPatientFollowupService::notifySignal` (cloche) et leur forme push (`ExpoPushService`). */
describe('notification ai_signal_detected (suggestion Cary)', () => {
  it('opens the missed appointment from the bell and from a push', () => {
    const expected = appointmentDetailHref('/(patient)', 'apt-1');
    const bell = {
      id: 'n1',
      type: 'ai_signal_detected',
      data: { signal_type: 'appointment_no_show', signal_id: 's1', appointment_id: 'apt-1' },
    };
    expect(resolveNotificationNavigation(bell, 'patient')).toEqual(expected);

    const push = {
      id: '',
      type: 'ai_signal_detected',
      appointment_id: 'apt-1',
      data: { type: 'ai_signal_detected', signal_type: 'appointment_no_show', signal_id: 's1', appointment_id: 'apt-1' },
    };
    expect(resolveNotificationNavigation(push, 'patient')).toEqual(expected);
  });

  it('stays informative for signals without appointment (no_navigate), bell and push alike', () => {
    const bell = {
      id: 'n2',
      type: 'ai_signal_detected',
      data: JSON.stringify({ signal_type: 'lab_overdue', signal_id: 's2', no_navigate: true }),
    };
    expect(resolveNotificationNavigation(bell, 'patient')).toBeNull();

    const push = {
      id: '',
      type: 'ai_signal_detected',
      data: { type: 'ai_signal_detected', signal_type: 'profile_incomplete', signal_id: 's3', no_navigate: '1' },
    };
    expect(resolveNotificationNavigation(push, 'patient')).toBeNull();
  });
});
