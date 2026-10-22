import {
  formatAppointmentDateShort,
  formatAppointmentDateTime,
  formatFrenchWeekdayDate,
} from '@/utils/appointment-datetime-fr';
import { appointmentDaySectionLabel } from '@/utils/appointment-list-sections';
import { formatMiniDateCalendarParts } from '@/utils/mini-date-calendar-parts';

/**
 * Jour affiché d'un RDV : badge liste (MiniDateCalendar) = en-tête de section = détail patient.
 * scheduled_at est une heure murale Paris sans fuseau (DATETIME MySQL).
 * À lancer aussi avec TZ=Europe/Paris, Asia/Dubai, America/New_York.
 */

const RealDate = Date;

/** Hermes : `new Date('10/23/2026, 12:30:00 AM')` (sortie de toLocaleString en-US) vaut NaN. */
class HermesLikeDate extends RealDate {
  constructor(...args: unknown[]) {
    if (args.length === 1 && typeof args[0] === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(args[0])) {
      super(Number.NaN);
    } else {
      super(...(args as []));
    }
  }
}

const CASES: { raw: string; detail: string; short: string; badge: [string, string, string] }[] = [
  { raw: '2026-10-23 00:00:00', detail: 'Vendredi 23 octobre 2026', short: 'ven. 23 oct.', badge: ['VEN', '23', 'OCT'] },
  { raw: '2026-10-23 00:30:00', detail: 'Vendredi 23 octobre 2026', short: 'ven. 23 oct.', badge: ['VEN', '23', 'OCT'] },
  { raw: '2026-10-23 08:00:00', detail: 'Vendredi 23 octobre 2026', short: 'ven. 23 oct.', badge: ['VEN', '23', 'OCT'] },
  { raw: '2026-10-23 23:30:00', detail: 'Vendredi 23 octobre 2026', short: 'ven. 23 oct.', badge: ['VEN', '23', 'OCT'] },
  { raw: '2026-10-23', detail: 'Vendredi 23 octobre 2026', short: 'ven. 23 oct.', badge: ['VEN', '23', 'OCT'] },
  // 25 octobre 2026 : passage à l'heure d'hiver à Paris (03:00 → 02:00).
  { raw: '2026-10-25 00:30:00', detail: 'Dimanche 25 octobre 2026', short: 'dim. 25 oct.', badge: ['DIM', '25', 'OCT'] },
  { raw: '2026-10-25 02:30:00', detail: 'Dimanche 25 octobre 2026', short: 'dim. 25 oct.', badge: ['DIM', '25', 'OCT'] },
  { raw: '2026-10-25 23:30:00', detail: 'Dimanche 25 octobre 2026', short: 'dim. 25 oct.', badge: ['DIM', '25', 'OCT'] },
  // Instants explicites (ISO à décalage) : jour civil Paris, quel que soit le fuseau de l'appareil.
  { raw: '2026-10-23T23:30:00+02:00', detail: 'Vendredi 23 octobre 2026', short: 'ven. 23 oct.', badge: ['VEN', '23', 'OCT'] },
  { raw: '2026-10-22T22:30:00Z', detail: 'Vendredi 23 octobre 2026', short: 'ven. 23 oct.', badge: ['VEN', '23', 'OCT'] },
  { raw: '2026-10-25T22:30:00Z', detail: 'Dimanche 25 octobre 2026', short: 'dim. 25 oct.', badge: ['DIM', '25', 'OCT'] },
];

const NOW_MS = RealDate.parse('2026-10-01T10:00:00Z');

function expectSameDay(c: (typeof CASES)[number]) {
  const badge = formatMiniDateCalendarParts(c.raw);
  expect(badge && [badge.weekdayLabel, badge.dayNumber, badge.monthLabel]).toEqual(c.badge);
  expect(formatFrenchWeekdayDate(c.raw, 'dddd D MMMM YYYY')).toBe(c.detail);
  expect(formatAppointmentDateTime(c.raw).startsWith(c.detail.toLowerCase())).toBe(true);
  expect(formatAppointmentDateShort(c.raw).startsWith(c.short)).toBe(true);
  expect(appointmentDaySectionLabel(c.raw, new Date(NOW_MS))).toBe(c.detail.replace(/ 2026$/, ''));
}

describe('jour du RDV identique liste / détail', () => {
  it.each(CASES)('$raw (moteur JS de test)', (c) => {
    expectSameDay(c);
  });

  describe('moteur type Hermes (Date ne relit pas les chaînes locales)', () => {
    beforeEach(() => {
      (global as { Date: DateConstructor }).Date = HermesLikeDate as unknown as DateConstructor;
    });
    afterEach(() => {
      (global as { Date: DateConstructor }).Date = RealDate;
    });

    it.each(CASES)('$raw', (c) => {
      expectSameDay(c);
    });
  });

  it('Aujourd’hui / Demain du badge suivent le jour civil France', () => {
    jest.useFakeTimers({ now: new RealDate('2026-10-22T21:30:00Z') }); // 23h30 à Paris, 01h30 à Dubaï
    try {
      expect(formatMiniDateCalendarParts('2026-10-22 08:00:00')?.relative).toBe('today');
      expect(formatMiniDateCalendarParts('2026-10-23 00:30:00')?.relative).toBe('tomorrow');
      expect(appointmentDaySectionLabel('2026-10-23 00:30:00')).toBe('Demain');
    } finally {
      jest.useRealTimers();
    }
  });
});
