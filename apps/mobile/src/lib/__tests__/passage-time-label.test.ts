import {
  flattenTourStopsWithSlotSections,
  formatPassageStopTimeLabel,
  formatPassageTimeSlotLabel,
  formatPassageTourListTimeLabel,
  moveTourStopWithinSlot,
  parsePassageAvailabilityRange,
} from '@oneandlab/shared-utils';

describe('horaires de passage infirmier', () => {
  it('affiche l’heure planifiée au format « 17h45 » sans créneau', () => {
    expect(formatPassageStopTimeLabel({ scheduled_at: '2026-10-01 17:45:00' })).toBe('17h45');
  });

  it('garde le même format pour un créneau personnalisé sans heure saisie', () => {
    expect(formatPassageTimeSlotLabel('custom', '2026-10-01 08:05:00')).toBe('08h05');
  });
});

describe('sections de créneau de la tournée', () => {
  it('omet l’en-tête quand tous les passages tombent dans le même créneau', () => {
    const rows = flattenTourStopsWithSlotSections([
      { stop_id: 'a', availability: { type: 'custom', range: [8, 10] } },
      { stop_id: 'b', availability: { type: 'custom', range: [17, 19] } },
    ]);
    expect(rows.map((row) => row.kind)).toEqual(['stop', 'stop']);
  });

  it('affiche un en-tête par créneau quand il y en a plusieurs', () => {
    const rows = flattenTourStopsWithSlotSections([
      { stop_id: 'a', passage_time_slot: 'morning' },
      { stop_id: 'b', passage_time_slot: 'evening' },
    ]);
    expect(rows.map((row) => row.kind)).toEqual(['section', 'stop', 'section', 'stop']);
  });

  it('numérote chaque passage dans son créneau pour borner les flèches', () => {
    const rows = flattenTourStopsWithSlotSections([
      { stop_id: 'a', passage_time_slot: 'morning' },
      { stop_id: 'b', passage_time_slot: 'morning' },
      { stop_id: 'c', passage_time_slot: 'evening' },
    ]);
    const stops = rows.flatMap((row) => (row.kind === 'stop' ? [[row.stop.stop_id, row.slotIndex, row.slotTotal]] : []));
    expect(stops).toEqual([
      ['a', 0, 2],
      ['b', 1, 2],
      ['c', 0, 1],
    ]);
  });
});

describe('réordonnancement manuel de la tournée', () => {
  const stops = [
    { stop_id: 'm1', passage_time_slot: 'morning' },
    { stop_id: 'e1', passage_time_slot: 'evening' },
    { stop_id: 'm2', passage_time_slot: 'morning' },
  ];

  it('échange deux passages du même créneau et renvoie l’ordre affiché', () => {
    expect(moveTourStopWithinSlot(stops, 'm2', 'up')?.map((s) => s.stop_id)).toEqual(['m2', 'm1', 'e1']);
  });

  it('refuse de sortir un passage de son créneau', () => {
    expect(moveTourStopWithinSlot(stops, 'm2', 'down')).toBeNull();
    expect(moveTourStopWithinSlot(stops, 'e1', 'up')).toBeNull();
  });
});

describe('heure exacte et quart d’heure', () => {
  it('garde les quarts d’heure de la plage enregistrée', () => {
    expect(parsePassageAvailabilityRange({ type: 'custom', range: [7.75, 8.75] })).toEqual([7.75, 8.75]);
  });

  it('affiche l’heure exacte d’un passage plutôt que sa plage d’une heure', () => {
    expect(
      formatPassageTourListTimeLabel({
        passage_time_slot: 'morning',
        passage_custom_time: '07:45',
        availability: { type: 'custom', range: [7.75, 8.75] },
      }),
    ).toBe('07h45');
  });

  it('garde la plage quand l’heure n’est que le début d’un créneau large', () => {
    expect(
      formatPassageTourListTimeLabel({
        passage_time_slot: 'custom',
        passage_custom_time: '08:00',
        availability: { type: 'custom', range: [8, 10] },
      }),
    ).toBe('8h00 — 10h00');
  });
});
