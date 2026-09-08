/** Aligné apps/mobile/.../build-reschedule-payload.ts */

export type RescheduleFormLike = {
  category_id: string;
  address: { label: string; lat: number; lng: number; complement?: string } | null;
  address_complement: string;
  scheduled_at: string;
  availability_type: 'custom' | 'all_day';
  notes: string;
};

export function nurseCanRescheduleInPlace(
  appointment: { type?: string; status?: string; assigned_nurse_id?: string | null } | null | undefined,
  userId: string | undefined,
): boolean {
  if (!appointment || !userId || appointment.type !== 'nursing') return false;
  if (String(appointment.assigned_nurse_id ?? '') !== String(userId)) return false;
  const status = String(appointment.status ?? '');
  return status === 'confirmed' || status === 'inProgress' || status === 'planned';
}

export function buildReschedulePutPayload(params: {
  appointment: Record<string, unknown>;
  form: RescheduleFormLike;
  scheduledAt: string;
  availabilityPayload: string;
  addressPayload: Record<string, unknown>;
}): Record<string, unknown> {
  const a = params.appointment;
  const fd = (a.form_data as Record<string, unknown>) || {};
  const formData: Record<string, unknown> = {
    ...fd,
    category_id: params.form.category_id || undefined,
    address_complement: params.form.address_complement?.trim() || undefined,
    availability: params.availabilityPayload,
    notes: params.form.notes?.trim() || undefined,
  };
  return {
    scheduled_at: params.scheduledAt,
    address: params.addressPayload,
    form_data: formData,
    category_id: params.form.category_id || a.category_id || undefined,
  };
}
