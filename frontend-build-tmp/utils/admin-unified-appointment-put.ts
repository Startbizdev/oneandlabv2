/**
 * Corps PUT /appointments/:id depuis le payload UnifiedAppointmentForm (commitBookingSubmit).
 */
import { isBloodTestAppointment, isNursingAppointment } from '~/utils/appointment-type-rules';
import type { SelectedServiceInput } from '~/utils/dashboard-unified-rdv';

function toIsoScheduledAt(raw: unknown): string | undefined {
  if (raw == null || typeof raw !== 'string' || raw.trim() === '') return undefined;
  const s = raw.trim();
  if (s.includes('T') && s.length >= 16) {
    try {
      const d = new Date(s);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    } catch {
      /* ignore */
    }
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const datePart = s.slice(0, 10);
    const timePart = s.includes(' ') ? s.slice(11).trim() : '';
    const time =
      timePart && /^\d{1,2}:\d{2}/.test(timePart)
        ? timePart.length === 5
          ? `${timePart}:00`
          : timePart
        : '09:00:00';
    const local = `${datePart} ${time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time}`;
    try {
      const d = new Date(local.replace(' ', 'T'));
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    } catch {
      /* ignore */
    }
  }
  return s;
}

function stripFilesFromFormData(fd: unknown): Record<string, unknown> {
  if (!fd || typeof fd !== 'object' || Array.isArray(fd)) return {};
  const o = { ...(fd as Record<string, unknown>) };
  if (o.files && typeof o.files === 'object') {
    const files = o.files as Record<string, unknown>;
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(files)) {
      if (v instanceof File) continue;
      clean[k] = v as unknown;
    }
    o.files = clean;
  }
  return o;
}

export function buildAdminAppointmentPutBody(
  unifiedPayload: Record<string, unknown>,
  opts: {
    status: string;
    assigned_lab_id?: string;
    assigned_nurse_id?: string;
    category_id?: string | null;
  },
): Record<string, unknown> {
  const selected = (unifiedPayload.selectedServices || []) as SelectedServiceInput[];
  const first = selected[0];
  const type = first?.type ?? '';

  const scheduled =
    toIsoScheduledAt(unifiedPayload.scheduled_at) ||
    toIsoScheduledAt((unifiedPayload.form_data as Record<string, unknown> | undefined)?.scheduled_at);

  const address = unifiedPayload.address as Record<string, unknown> | null | undefined;

  const rawFd = unifiedPayload.form_data as Record<string, unknown> | undefined;
  const form_data = stripFilesFromFormData(rawFd || {});

  const category_id =
    opts.category_id != null && String(opts.category_id).trim() !== ''
      ? String(opts.category_id)
      : first?.category_id != null
        ? String(first.category_id)
        : undefined;

  if (category_id && !form_data.category_id) {
    form_data.category_id = category_id;
  }

  const body: Record<string, unknown> = {
    type,
    form_type: type,
    status: opts.status,
    form_data,
  };

  if (category_id) {
    body.category_id = category_id;
  }

  if (scheduled) body.scheduled_at = scheduled;
  if (address && typeof address === 'object' && address.label) {
    body.address = address;
  }

  if (isBloodTestAppointment(type)) {
    body.assigned_lab_id = opts.assigned_lab_id?.trim() ? opts.assigned_lab_id.trim() : null;
  }
  if (isNursingAppointment(type)) {
    body.assigned_nurse_id = opts.assigned_nurse_id?.trim() ? opts.assigned_nurse_id.trim() : null;
  }

  return body;
}

/** Fichiers binaires à uploader après PUT (médecine — même champ que AppointmentForm). */
export function extractUnifiedPayloadFiles(payload: Record<string, unknown>): Record<string, File> {
  const out: Record<string, File> = {};
  const top = payload.files as Record<string, unknown> | undefined;
  if (top && typeof top === 'object') {
    for (const [k, v] of Object.entries(top)) {
      if (v instanceof File) out[k] = v;
    }
  }
  return out;
}
