import { describe, expect, it } from 'vitest';
import { toggleBookingDate } from '~/utils/booking-date-selection';

describe('sélection multiple de dates', () => {
  it('remplit la date principale et les dates supplémentaires', () => {
    const first = toggleBookingDate('', [], '2026-11-06');
    const second = toggleBookingDate(first.scheduled_at, first.extra_scheduled_dates, '2026-11-02');
    expect(second).toEqual({
      scheduled_at: '2026-11-02',
      extra_scheduled_dates: ['2026-11-06'],
    });
  });

  it('retire un jour déjà choisi', () => {
    const next = toggleBookingDate('2026-11-02', ['2026-11-06'], '2026-11-02');
    expect(next).toEqual({
      scheduled_at: '2026-11-06',
      extra_scheduled_dates: [],
    });
  });
});
