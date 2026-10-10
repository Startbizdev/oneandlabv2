import { describe, expect, it } from 'vitest';
import { buildDashboardAppointmentPayloads } from '@oneandlab/shared-utils';

const ctx = { creatorRole: 'patient', creatorUserId: 'u1' };
const blood = { id: 'b1', type: 'blood_test', name: 'NFS', category_id: 'c1' };
const blood2 = { id: 'b2', type: 'blood_test', name: 'CRP', category_id: 'c2' };
const nurse = { id: 'n1', type: 'nursing', name: 'Pansement', category_id: 'c3' };
const nurse2 = { id: 'n2', type: 'nursing', name: 'Injection', category_id: 'c4' };

function form(byService: Record<string, Record<string, unknown>>) {
  return { formDataByService: byService, address: { city: 'Paris' } };
}

describe('rendez-vous prélèvement multi-dates', () => {
  it('garde un prélèvement et un soin sur une seule date', () => {
    const payloads = buildDashboardAppointmentPayloads(
      'p1',
      form({
        b1: { blood_test_type: 'single', scheduled_at: '2026-11-02', duration_days: '1' },
        n1: { scheduled_at: '2026-11-02', duration_days: '1' },
      }),
      [blood, nurse],
      ctx,
    );
    expect(payloads.map((p) => p.type)).toEqual(['blood_test', 'nursing']);
  });

  it('crée un seul rendez-vous labo pour plusieurs dates et fusionne les soins infirmiers', () => {
    const payloads = buildDashboardAppointmentPayloads(
      'p1',
      form({
        b1: {
          blood_test_type: 'single',
          date_selection_mode: 'multiple',
          scheduled_at: '2026-11-02',
          extra_scheduled_dates: ['2026-11-04', '2026-11-06'],
        },
        b2: { blood_test_type: 'single', scheduled_at: '2026-11-02' },
        n1: { scheduled_at: '2026-11-03', duration_days: '7', frequency: 'daily' },
        n2: { scheduled_at: '2026-11-03', duration_days: '7', frequency: 'daily' },
      }),
      [blood, blood2, nurse, nurse2],
      { ...ctx, creationBatchId: '11111111-1111-4111-8111-111111111111' },
    );
    const bloodRows = payloads.filter((p) => p.type === 'blood_test');
    const nursingRows = payloads.filter((p) => p.type === 'nursing');
    expect(bloodRows).toHaveLength(1);
    expect(bloodRows[0].visit_dates).toEqual(['2026-11-02', '2026-11-04', '2026-11-06']);
    expect(String(bloodRows[0].scheduled_at).slice(0, 10)).toBe('2026-11-02');
    expect((bloodRows[0].blood_test_items as unknown[]).length).toBe(2);
    expect(nursingRows).toHaveLength(1);
    expect((nursingRows[0].nursing_items as unknown[]).length).toBe(2);
  });
});
