import {
  formatDailySlotLabel,
  normalizeDailySlots,
  seriesDailySlots,
  withDailySlotTime,
} from '../../features/nurse-passage/utils/passage-daily-slots';
import { defaultPlanningFormState, previewPassageCount } from '../../features/nurse-passage/utils/passage-planning';
import { passageNursingItemKey } from '../../features/nurse-passage/utils/passage-nursing-item-label';
import { clampAvailabilityRange } from '../../features/appointments/form/utils/booking-availability-utils';

describe('créneaux quotidiens d’une série de passages', () => {
  it('stocke une heure précise seulement si elle diffère de l’heure du créneau', () => {
    expect(withDailySlotTime({ time_slot: 'morning', custom_time: null }, '07:45')).toEqual({
      time_slot: 'morning',
      custom_time: '07:45',
    });
    expect(withDailySlotTime({ time_slot: 'morning', custom_time: '07:45' }, '08:00')).toEqual({
      time_slot: 'morning',
      custom_time: null,
    });
  });

  it('dédoublonne par heure et trie chronologiquement', () => {
    expect(
      normalizeDailySlots([
        { time_slot: 'custom', custom_time: '19:00' },
        { time_slot: 'morning', custom_time: null },
        { time_slot: 'custom', custom_time: '08:00' },
        { time_slot: 'custom', custom_time: '12:30' },
      ]),
    ).toEqual([
      { time_slot: 'morning', custom_time: null },
      { time_slot: 'custom', custom_time: '12:30' },
      { time_slot: 'custom', custom_time: '19:00' },
    ]);
  });

  it('garde « toute la journée » seul', () => {
    expect(
      normalizeDailySlots([
        { time_slot: 'morning', custom_time: null },
        { time_slot: 'all_day', custom_time: null },
      ]),
    ).toEqual([{ time_slot: 'all_day', custom_time: null }]);
  });

  it('affiche l’heure précise, sinon le nom du créneau', () => {
    expect(formatDailySlotLabel({ time_slot: 'custom', custom_time: '12:30' })).toBe('12h30');
    expect(formatDailySlotLabel({ time_slot: 'noon', custom_time: null })).toBe('Midi');
  });

  it('relit les créneaux d’une série, ou son créneau principal à défaut', () => {
    const slots = [
      { time_slot: 'custom' as const, custom_time: '08:00' },
      { time_slot: 'custom' as const, custom_time: '19:00' },
    ];
    expect(seriesDailySlots({ time_slot: 'custom', custom_time: '08:00', planning_config: { daily_time_slots: slots } })).toBe(
      slots,
    );
    expect(seriesDailySlots({ time_slot: 'evening', custom_time: '18:30:00', planning_config: {} })).toEqual([
      { time_slot: 'evening', custom_time: '18:30' },
    ]);
  });
});

describe('création d’un passage chronique', () => {
  it('propose tous les jours de la semaine, sans date de fin', () => {
    const state = defaultPlanningFormState('2030-01-07', { recurring: true });
    expect(state.planningMode).toBe('weekdays');
    expect(state.weekdays).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(state.openEnded).toBe(true);
  });

  it('multiplie l’aperçu par le nombre de créneaux du jour', () => {
    const state = { ...defaultPlanningFormState('2030-01-07'), planningMode: 'weekdays' as const, weekdays: [1, 2, 3], endDate: '2030-01-13' };
    expect(previewPassageCount(state, [], 1)).toBe(3);
    expect(previewPassageCount(state, [], 3)).toBe(9);
  });
});

describe('soins et curseur horaire', () => {
  it('distingue un même soin avec des options différentes', () => {
    const a = passageNursingItemKey({ category_id: 'inj', care_options: { voie: 'IM', zone: 'bras' } });
    const b = passageNursingItemKey({ category_id: 'inj', care_options: { zone: 'bras', voie: 'IM' } });
    const c = passageNursingItemKey({ category_id: 'inj', care_options: { voie: 'SC' } });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('arrondit la plage au quart d’heure pour un passage, à l’heure pour un RDV', () => {
    expect(clampAvailabilityRange(7.8, 9.1, 20, 6, 0.25)).toEqual([7.75, 9]);
    expect(clampAvailabilityRange(7.8, 9.1, 20, 6)).toEqual([8, 9]);
  });
});
