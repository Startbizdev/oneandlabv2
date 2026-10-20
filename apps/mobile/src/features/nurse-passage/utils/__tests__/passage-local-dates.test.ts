import type { Appointment } from '@oneandlab/shared-types';
import { todayTourDate } from '@/features/tournee-nurse/hooks/nurse-tour-query';
import { buildAppointmentPassageUpdateBody, initPassageFormFromAppointment } from '../passage-appointment-update';

/** 00h30 à Paris le 21 octobre = encore le 20 en UTC : une date tirée de `toISOString()` serait la veille. */
const PARIS_AFTER_MIDNIGHT = new Date('2026-10-20T22:30:00Z');

const previousTz = process.env.TZ;

beforeAll(() => {
  process.env.TZ = 'Europe/Paris';
  jest.useFakeTimers({ now: PARIS_AFTER_MIDNIGHT });
});

afterAll(() => {
  jest.useRealTimers();
  process.env.TZ = previousTz;
});

describe('dates par défaut des passages en heure locale', () => {
  it('le jour de tournée est le jour local, pas le jour UTC', () => {
    expect(PARIS_AFTER_MIDNIGHT.toISOString().slice(0, 10)).toBe('2026-10-20');
    expect(todayTourDate()).toBe('2026-10-21');
  });

  it('un passage sans date planifiée tombe le jour local', () => {
    const apt = { id: 'apt-1', form_data: {}, scheduled_at: null } as unknown as Appointment;

    const body = buildAppointmentPassageUpdateBody(apt, { time_slot: 'all_day' }, initPassageFormFromAppointment(apt));

    expect(body.scheduled_at).toBe('2026-10-21 08:00:00');
  });
});
