/**
 * Corps PUT /appointments/:id depuis le payload UnifiedAppointmentForm (commitBookingSubmit).
 */
import { isBloodTestAppointment, isNursingAppointment } from '~/utils/appointment-type-rules';
import type { SelectedServiceInput } from '~/utils/dashboard-unified-rdv';

function toAppointmentScheduledAt(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const value = raw.trim();
  // An entered clock time belongs to France, independently of the browser timezone.
  const local = value.match(/^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2})(?::(\d{2}))?)?$/);
  if (local) return `${local[1]} ${local[2] || '09:00'}:${local[3] || '00'}`;
  // Explicit instants retain their offset; the API converts them to Europe/Paris.
  return value;
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
    toAppointmentScheduledAt(unifiedPayload.scheduled_at) ||
    toAppointmentScheduledAt((unifiedPayload.form_data as Record<string, unknown> | undefined)?.scheduled_at);

  const address = unifiedPayload.address as Record<string, unknown> | null | undefined;

  const rawFd = unifiedPayload.form_data as Record<string, unknown> | undefined;
  const form_data = stripFilesFromFormData(rawFd || {});
  if (selected.length && (isBloodTestAppointment(type) || isNursingAppointment(type))) {
    const itemKey = isBloodTestAppointment(type) ? 'blood_test_items' : 'nursing_items';
    const perService = unifiedPayload.formDataByService as Record<string, Record<string, unknown>> | undefined;
    form_data[itemKey] = selected.map((service, index) => ({
      category_id: service.category_id ?? null,
      label: service.name,
      care_options: perService?.[service.id]?.care_options ?? (selected.length === 1 ? form_data.care_options : {}) ?? {},
      sort_order: index,
    }));
  }

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
  const fields = payload.form_data as Record<string, unknown> | undefined;
  for (const candidate of [fields?.files, payload.files]) {
    if (candidate && typeof candidate === 'object') {
      for (const [k, v] of Object.entries(candidate)) {
        if (v instanceof File) out[k] = v;
      }
    }
  }
  return out;
}
