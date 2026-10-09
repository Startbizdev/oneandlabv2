import type { PatientTransmission, TransmissionCareItemsForDate } from '@oneandlab/shared-types';
import {
  initialTransmissionDraft,
  passageItemsToPreselect,
  toggleCareItem,
  transmissionAuthorLine,
  transmissionCareOptions,
  transmissionInputFromDraft,
  transmissionTimeLabel,
  withOccurredOn,
} from '@oneandlab/shared-utils';
import { transmissionDaySections } from '../../features/patients/utils/transmission-feed';

const TODAY = '2026-10-06';

const careItems: TransmissionCareItemsForDate = {
  date: TODAY,
  passage_items: [
    { kind: 'nursing_item', id: 'i1', label: 'Pansement', appointment_id: 'a1', done: true },
    { kind: 'nursing_item', id: 'i2', label: 'Injection', appointment_id: 'a1', done: false },
    { kind: 'nursing_item', id: 'i3', label: 'Glycémie', appointment_id: 'a2', done: false },
  ],
  categories: [{ kind: 'category', id: 'c1', label: 'Vaccination' }],
};

function transmission(overrides: Partial<PatientTransmission> = {}): PatientTransmission {
  return {
    id: 't1',
    patient_id: 'p1',
    occurred_on: '2026-10-05',
    body: 'Plaie propre',
    care_items: [{ kind: 'category', id: 'c1', label: 'Vaccination' }],
    appointment_id: null,
    for_doctor: true,
    author: { id: 'n1', name: 'Nina Infirmière', role: 'nurse' },
    created_at: '2026-10-05T08:00:00+00:00',
    edited_at: null,
    can_edit: true,
    ...overrides,
  };
}

describe('transmission draft', () => {
  it('starts today, empty, and keeps a passage or Cary prefill', () => {
    expect(initialTransmissionDraft(TODAY)).toMatchObject({ occurredOn: TODAY, body: '', forDoctor: false, selected: [] });
    expect(initialTransmissionDraft(TODAY, null, { appointmentId: 'a1', occurredOn: '2026-10-04', body: 'Dicté' })).toMatchObject({
      occurredOn: '2026-10-04',
      body: 'Dicté',
      appointmentId: 'a1',
      autoSelectAppointmentId: 'a1',
    });
  });

  it('never starts on a future day', () => {
    expect(initialTransmissionDraft(TODAY, null, { occurredOn: '2026-10-07' }).occurredOn).toBe(TODAY);
  });

  it('reloads an existing transmission for its author', () => {
    expect(initialTransmissionDraft(TODAY, transmission())).toMatchObject({
      occurredOn: '2026-10-05',
      body: 'Plaie propre',
      forDoctor: true,
      selected: [{ kind: 'category', id: 'c1', label: 'Vaccination' }],
      autoSelectAppointmentId: null,
    });
  });

  it('preselects the care done during the passage, else all its care', () => {
    expect(passageItemsToPreselect(careItems, 'a1').map((i) => i.id)).toEqual(['i1']);
    expect(passageItemsToPreselect(careItems, 'a2').map((i) => i.id)).toEqual(['i3']);
  });

  it('offers the passage care of the day, else the catalog, and keeps checked items visible', () => {
    const selected = [{ kind: 'category' as const, id: 'c1', label: 'Vaccination' }];
    expect(transmissionCareOptions(careItems, selected).map((i) => i.id)).toEqual(['i1', 'i2', 'i3', 'c1']);
    expect(transmissionCareOptions({ ...careItems, passage_items: [] }, selected).map((i) => i.id)).toEqual(['c1']);
  });

  it('drops the passage care and appointment when the day changes', () => {
    const draft = {
      ...initialTransmissionDraft(TODAY, null, { appointmentId: 'a1' }),
      selected: [
        { kind: 'nursing_item' as const, id: 'i1', label: 'Pansement' },
        { kind: 'category' as const, id: 'c1', label: 'Vaccination' },
      ],
    };
    const moved = withOccurredOn(draft, '2026-10-01');
    expect(moved.selected.map((i) => i.id)).toEqual(['c1']);
    expect(moved.appointmentId).toBeNull();
    expect(withOccurredOn(draft, TODAY)).toBe(draft);
  });

  it('builds the API input with the single passage of the checked care', () => {
    let draft = { ...initialTransmissionDraft(TODAY), body: '  Bonne évolution  ' };
    draft = { ...draft, selected: toggleCareItem(draft.selected, { kind: 'nursing_item', id: 'i3', label: 'Glycémie' }) };
    expect(transmissionInputFromDraft(draft, careItems)).toEqual({
      body: 'Bonne évolution',
      occurred_on: TODAY,
      care_items: [{ kind: 'nursing_item', id: 'i3' }],
      appointment_id: 'a2',
      for_doctor: false,
    });
    draft = { ...draft, selected: toggleCareItem(draft.selected, { kind: 'nursing_item', id: 'i1', label: 'Pansement' }) };
    expect(transmissionInputFromDraft(draft, careItems).appointment_id).toBeNull();
    draft = { ...draft, selected: toggleCareItem(draft.selected, { kind: 'nursing_item', id: 'i1', label: 'Pansement' }) };
    expect(draft.selected.map((i) => i.id)).toEqual(['i3']);
  });
});

describe('transmission feed', () => {
  it('groups the feed by day of care with readable headers', () => {
    const now = new Date('2026-10-06T10:00:00+02:00');
    const sections = transmissionDaySections(
      [
        transmission({ id: 't3', occurred_on: '2026-10-06' }),
        transmission({ id: 't2', occurred_on: '2026-10-05' }),
        transmission({ id: 't1', occurred_on: '2026-10-05' }),
      ],
      now,
    );
    expect(sections.map((s) => [s.title, s.data.map((t) => t.id)])).toEqual([
      ["Aujourd'hui", ['t3']],
      ['Hier', ['t2', 't1']],
    ]);
  });

  it('shows the author and role, or the role alone when the author is gone', () => {
    expect(transmissionAuthorLine({ id: 'n1', name: 'Nina Infirmière', role: 'nurse' })).toBe('Nina Infirmière · Infirmier');
    expect(transmissionAuthorLine({ id: null, name: null, role: 'pro' })).toBe('Professionnel');
  });

  it('shows the writing time on the care day, and the writing day for a late entry', () => {
    expect(transmissionTimeLabel({ occurred_on: '2026-10-06', created_at: '2026-10-06T09:39:09+02:00' })).toBe('09:39');
    expect(transmissionTimeLabel({ occurred_on: '2026-10-05', created_at: '2026-10-06T09:39:09+02:00' })).toBe('Écrite le 6 oct.');
    expect(transmissionTimeLabel({ occurred_on: '2026-10-06', created_at: '2026-10-05T23:30:00+00:00' })).toBe('01:30');
  });
});
