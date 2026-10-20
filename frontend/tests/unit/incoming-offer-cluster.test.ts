import { describe, expect, it } from 'vitest';
import {
  incomingOfferIdsCoveredByOpen,
  planIncomingOfferEnqueue,
  type IncomingOfferClusterSource,
} from '@oneandlab/shared-utils';

function line(
  id: string,
  overrides: Partial<Omit<IncomingOfferClusterSource, 'id'>> = {},
): IncomingOfferClusterSource & { id: string } {
  return {
    id,
    type: 'nursing',
    status: 'pending',
    patient_id: 'patient-1',
    relative_id: null,
    created_at: '2026-10-15T08:00:00',
    scheduled_at: '2026-10-16T09:00:00',
    category_name: 'Pansement',
    creation_batch_id: null,
    ...overrides,
  };
}

describe('file de la fenêtre nouveau rendez-vous', () => {
  it('n’enfile qu’une ligne quand le lot SQL est le même', () => {
    const plan = planIncomingOfferEnqueue(
      [
        line('a', { creation_batch_id: 'batch-1' }),
        line('b', { creation_batch_id: 'batch-1', created_at: '2026-10-15T08:00:05' }),
      ],
      [],
    );
    expect(plan.enqueue.map((item) => item.id)).toEqual(['a']);
    expect(plan.coveredIds).toEqual(['b']);
    expect(plan.enqueue[0].batch_siblings?.map((sibling) => sibling?.id)).toEqual(['b']);
    expect(plan.enqueue[0].batch_siblings?.[0]?.separate_offer_line).toBe(false);
  });

  it('regroupe le même patient créé dans les deux minutes sans lot', () => {
    const plan = planIncomingOfferEnqueue(
      [
        line('a'),
        line('b', { created_at: '2026-10-15T08:01:00', category_name: 'Injection' }),
      ],
      [],
    );
    expect(plan.enqueue).toHaveLength(1);
    expect(plan.coveredIds).toEqual(['b']);
    expect(plan.enqueue[0].batch_siblings?.[0]?.separate_offer_line).toBe(true);
  });

  it('laisse deux fenêtres si les lignes sont trop éloignées ou pour un autre patient', () => {
    const far = planIncomingOfferEnqueue(
      [line('a'), line('b', { created_at: '2026-10-15T08:05:00' })],
      [],
    );
    expect(far.enqueue.map((item) => item.id)).toEqual(['a', 'b']);

    const otherPatient = planIncomingOfferEnqueue(
      [line('a'), line('b', { patient_id: 'patient-2', created_at: '2026-10-15T08:00:10' })],
      [],
    );
    expect(otherPatient.enqueue).toHaveLength(2);
  });

  it('ne réenfile pas une ligne qui rejoint un envoi déjà affiché', () => {
    const plan = planIncomingOfferEnqueue(
      [line('b', { created_at: '2026-10-15T08:00:40' })],
      [line('a')],
    );
    expect(plan.enqueue).toEqual([]);
    expect(plan.coveredIds).toEqual(['b']);
  });

  it('retire de la file les frères renvoyés par le détail', () => {
    const ids = incomingOfferIdsCoveredByOpen(
      {
        ...line('a', { creation_batch_id: 'batch-1' }),
        batch_siblings: [
          { id: 'b', status: 'pending', scheduled_at: '2026-10-16T09:00:00' },
        ],
      },
      [line('b', { creation_batch_id: null }), line('c', { patient_id: 'patient-2' })],
    );
    expect(ids).toContain('a');
    expect(ids).toContain('b');
    expect(ids).not.toContain('c');
  });
});
