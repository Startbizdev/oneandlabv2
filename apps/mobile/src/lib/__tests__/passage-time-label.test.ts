import {
  flattenTourStopsWithSlotSections,
  formatPassageStopTimeLabel,
  formatPassageTimeSlotLabel,
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
});
