import { describe, it, expect } from 'vitest';
import {
  buildLabAppointmentsListParams,
  buildLabDashboardPendingFetchParams,
  buildLabDashboardTodayFetchParams,
  filterAppointmentsOnParisDay,
  filterPendingUnassignedLabAppointments,
  parisTodayYmd,
} from '../../composables/useAppointmentsList';

describe('useAppointmentsList helpers', () => {
  it('buildLabAppointmentsListParams sets scope=list and clamps limit', () => {
    expect(buildLabAppointmentsListParams({ page: 2, limit: 100, status: 'pending' })).toEqual({
      scope: 'list',
      page: '2',
      limit: '50',
      status: 'pending',
    });
  });

  it('filters today and pending unassigned', () => {
    const rows = [
      { id: '1', scheduled_at: '2026-09-26 09:00:00', status: 'confirmed', assigned_lab_id: 'lab' },
      { id: '2', scheduled_at: '2026-09-26 10:00:00', status: 'pending', assigned_lab_id: null },
      { id: '3', scheduled_at: '2026-09-25 10:00:00', status: 'pending', assigned_lab_id: null },
    ];
    expect(filterAppointmentsOnParisDay(rows, '2026-09-26').map((r) => r.id)).toEqual(['1', '2']);
    expect(filterPendingUnassignedLabAppointments(rows).map((r) => r.id)).toEqual(['2', '3']);
  });

  it('dashboard fetch params include today bounds and pending status', () => {
    expect(buildLabDashboardTodayFetchParams('2026-09-26')).toMatchObject({
      scope: 'list',
      date_from: '2026-09-26 00:00:00',
      date_to: '2026-09-26 23:59:59',
    });
    expect(buildLabDashboardPendingFetchParams()).toMatchObject({
      scope: 'list',
      status: 'pending',
    });
    expect(parisTodayYmd(new Date('2026-09-26T12:00:00+02:00'))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
