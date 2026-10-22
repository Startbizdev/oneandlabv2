import type { Appointment } from '@oneandlab/shared-types';
import { todayTourDate } from '@/features/tournee-nurse/hooks/nurse-tour-query';
import { buildAppointmentPassageUpdateBody, initPassageFormFromAppointment } from '../passage-appointment-update';

/**
 * Instants construits en heure locale de la machine (le fuseau ne se change pas depuis un test jest) :
 * 00h30 et 23h30 le 21 octobre. Hors UTC, l'un des deux tombe un autre jour en UTC : une date tirée de
 * `toISOString()` donnerait la veille ou le lendemain.
 */
const LOCAL_AFTER_MIDNIGHT = new Date(2026, 9, 21, 0, 30);
const LOCAL_BEFORE_MIDNIGHT = new Date(2026, 9, 21, 23, 30);

afterEach(() => jest.useRealTimers());

describe.each([
  ['00h30', LOCAL_AFTER_MIDNIGHT],
  ['23h30', LOCAL_BEFORE_MIDNIGHT],
])('dates par défaut des passages à %s, heure locale', (_label, now) => {
  beforeEach(() => jest.useFakeTimers({ now }));

  it('le jour de tournée est le jour local', () => {
    expect(todayTourDate()).toBe('2026-10-21');
  });

  it('un passage sans date planifiée tombe le jour local', () => {
    const apt = { id: 'apt-1', form_data: {}, scheduled_at: null } as unknown as Appointment;

    const body = buildAppointmentPassageUpdateBody(apt, { time_slot: 'all_day' }, initPassageFormFromAppointment(apt));

    expect(body.scheduled_at).toBe('2026-10-21 08:00:00');
  });
});

it('le jeu d’instants couvre un jour UTC différent dès que la machine n’est pas en UTC', () => {
  const utcDays = [LOCAL_AFTER_MIDNIGHT, LOCAL_BEFORE_MIDNIGHT].map((d) => d.toISOString().slice(0, 10));
  const offsetMinutes = LOCAL_AFTER_MIDNIGHT.getTimezoneOffset();
  if (offsetMinutes !== 0) expect(utcDays).not.toEqual(['2026-10-21', '2026-10-21']);
});
