/**
 * Liste RDV dashboard (lab/subaccount) — paramètres scope=list + pagination et filtres partagés.
 */

export type LabDashboardAppointmentRow = {
  id?: string | number;
  scheduled_at?: string | null;
  status?: string | null;
  assigned_lab_id?: string | number | null;
};

export function buildLabAppointmentsListParams(opts: {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
}): Record<string, string> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 24));
  const params: Record<string, string> = {
    scope: 'list',
    page: String(page),
    limit: String(limit),
  };
  if (opts.dateFrom) params.date_from = opts.dateFrom;
  if (opts.dateTo) params.date_to = opts.dateTo;
  if (opts.status) params.status = opts.status;
  return params;
}

/** Date du jour au format YYYY-MM-DD (Europe/Paris), aligné dashboard lab. */
export function parisTodayYmd(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
}

/** Filtre les RDV dont scheduled_at tombe sur `todayYmd` (préfixe date). */
export function filterAppointmentsOnParisDay<T extends LabDashboardAppointmentRow>(
  appointments: T[],
  todayYmd: string,
): T[] {
  return appointments
    .filter((a) => a.scheduled_at?.startsWith(todayYmd))
    .sort((a, b) => (a.scheduled_at || '').localeCompare(b.scheduled_at || ''));
}

/** RDV pending sans laboratoire assigné (carte « en attente » dashboard lab). */
export function filterPendingUnassignedLabAppointments<T extends LabDashboardAppointmentRow>(
  rows: T[],
): T[] {
  return rows.filter((a) => a.status === 'pending' && a.assigned_lab_id == null);
}

export function buildLabDashboardTodayFetchParams(todayYmd: string): Record<string, string> {
  return buildLabAppointmentsListParams({
    dateFrom: `${todayYmd} 00:00:00`,
    dateTo: `${todayYmd} 23:59:59`,
  });
}

export function buildLabDashboardPendingFetchParams(): Record<string, string> {
  return buildLabAppointmentsListParams({ status: 'pending' });
}
