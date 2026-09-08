import type { Appointment } from '@oneandlab/shared-types';
import type { AddressPayload } from '../../form/types';
import { buildAvailabilityPayload } from '../../form/utils/availability';
import { normalizeRescheduleDate } from './normalize-reschedule-date';

export type RescheduleChoiceMode = 'cancel_and_new' | 'create_only';

export type RescheduleFormValues = {
  category_id: string;
  address: AddressPayload | null;
  address_complement: string;
  scheduled_at: string;
  availability_type: 'custom' | 'all_day';
  availability_range: [number, number];
  notes: string;
};

type BuildCtx = {
  appointment: Appointment;
  form: RescheduleFormValues;
  role: string;
  userId: string;
  labId?: string | null;
};

const STAFF_ROLES_REQUIRING_CONSENT = new Set(['nurse', 'pro', 'lab', 'subaccount']);

function buildRescheduleCore(ctx: BuildCtx): {
  scheduledAt: string;
  addressPayload: Record<string, unknown>;
  formData: Record<string, unknown>;
  categoryId: string | undefined;
} | null {
  const { appointment: a, form } = ctx;
  const hour = form.availability_type === 'custom' ? Math.floor(form.availability_range[0]) : 9;
  const scheduledAt = form.scheduled_at
    ? `${normalizeRescheduleDate(form.scheduled_at)} ${String(hour).padStart(2, '0')}:00:00`
    : undefined;
  const availabilityPayload = buildAvailabilityPayload(form.availability_type, form.availability_range);

  const addressPayload =
    form.address?.label && form.address.lat != null && form.address.lng != null
      ? {
          ...form.address,
          complement: form.address_complement?.trim() || undefined,
        }
      : undefined;

  if (!addressPayload || !scheduledAt) return null;

  const fd = (a.form_data ?? {}) as Record<string, unknown>;
  const formData: Record<string, unknown> = {
    ...fd,
    category_id: form.category_id || undefined,
    address_complement: form.address_complement?.trim() || undefined,
    availability: availabilityPayload,
    notes: form.notes?.trim() || undefined,
  };

  return {
    scheduledAt,
    addressPayload,
    formData,
    categoryId: form.category_id || a.category_id || undefined,
  };
}

/** Infirmier assigné à un soin confirmé : modifier le RDV existant (PUT), pas annuler + recréer. */
export function nurseCanRescheduleInPlace(appointment: Appointment, userId: string | undefined): boolean {
  if (!userId || appointment.type !== 'nursing') return false;
  const assigned = (appointment as Appointment & { assigned_nurse_id?: string }).assigned_nurse_id;
  if (String(assigned ?? '') !== String(userId)) return false;
  const status = String(appointment.status ?? '');
  return status === 'confirmed' || status === 'inProgress' || status === 'planned';
}

export function buildReschedulePutPayload(ctx: BuildCtx): Record<string, unknown> | null {
  const core = buildRescheduleCore(ctx);
  if (!core) return null;
  return {
    scheduled_at: core.scheduledAt,
    address: core.addressPayload,
    form_data: core.formData,
    category_id: core.categoryId,
  };
}

export function buildReschedulePayload(ctx: BuildCtx): Record<string, unknown> | null {
  const { appointment: a, form, role, userId } = ctx;
  const core = buildRescheduleCore(ctx);
  if (!core) return null;

  const payload: Record<string, unknown> = {
    type: a.type,
    form_type: a.type,
    scheduled_at: core.scheduledAt,
    address: core.addressPayload,
    form_data: core.formData,
    status: 'confirmed',
    patient_id: a.patient_id || undefined,
    relative_id: a.relative_id || undefined,
    category_id: core.categoryId,
  };

  if (STAFF_ROLES_REQUIRING_CONSENT.has(role)) {
    payload.patient_booking_consent = true;
  }

  const fd = (a.form_data ?? {}) as Record<string, unknown>;
  const rel = (a as Appointment & { relative?: { email?: string } }).relative;
  if (!payload.patient_id && (fd.email || rel?.email)) {
    payload.guest_email = fd.email || rel?.email;
  }

  if (a.type === 'nursing' && userId && role === 'nurse') {
    payload.assigned_nurse_id = userId;
  } else if (a.type === 'blood_test' && userId) {
    if (role === 'preleveur') {
      payload.assigned_to = userId;
      const labId =
        (ctx.labId && String(ctx.labId)) ||
        ((a as Appointment & { assigned_lab_id?: string }).assigned_lab_id &&
          String((a as Appointment & { assigned_lab_id?: string }).assigned_lab_id)) ||
        undefined;
      if (labId) payload.assigned_lab_id = labId;
      payload.reschedule_from_appointment_id = a.id;
    } else if (role === 'lab') {
      payload.assigned_lab_id = userId;
    } else if (role === 'subaccount') {
      payload.assigned_lab_id = (ctx.labId && String(ctx.labId)) || userId;
    } else {
      const ext = a as Appointment & { assigned_lab_id?: string; assigned_to?: string };
      if (ext.assigned_lab_id) payload.assigned_lab_id = ext.assigned_lab_id;
      if (ext.assigned_to) payload.assigned_to = ext.assigned_to;
    }
  }

  return payload;
}
