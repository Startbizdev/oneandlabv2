import type { ApiResponse } from '@oneandlab/shared-api';
import type { Appointment } from '@oneandlab/shared-types';
import { api } from '@/api/client';
import { randomUUID } from '@/lib/uuid';
import { createAppointment } from './appointments.service';
import { uploadAppointmentDocuments } from './upload-appointment-documents';

export type AppointmentCreatePayload = Record<string, unknown> & {
  type?: string;
  creation_batch_id?: string;
  creation_batch_size?: number;
  patient_email?: string;
  form_data?: { files?: Record<string, unknown> };
  files?: Record<string, unknown>;
};

/**
 * source: frontend/composables/useAppointments.ts createMultipleAppointments
 */
export async function createMultipleAppointments(
  payloads: AppointmentCreatePayload[],
): Promise<{ success: boolean; createdIds: string[]; error?: string }> {
  const createdIds: string[] = [];
  const deferPostCreate = payloads.length > 1;

  const types = new Set(payloads.map((p) => p.type));
  const sameTypeMulti =
    payloads.length > 1 && types.size === 1 && (types.has('nursing') || types.has('blood_test'));
  const firstBatch = payloads[0]?.creation_batch_id;
  const allShareExplicitBatch =
    sameTypeMulti && !!firstBatch && payloads.every((p) => p.creation_batch_id === firstBatch);
  const sharedBatch = allShareExplicitBatch
    ? firstBatch
    : sameTypeMulti
      ? randomUUID()
      : undefined;

  const batchTotal = payloads.length;
  const patientEmail = payloads
    .map((p) => (p as { patient_email?: string }).patient_email)
    .find((e) => e && String(e).trim() !== '');

  for (let i = 0; i < payloads.length; i++) {
    const payload: AppointmentCreatePayload = { ...payloads[i] };
    if (sharedBatch) {
      payload.creation_batch_id = sharedBatch;
      payload.creation_batch_size = batchTotal;
      if (patientEmail && !(payload as { patient_email?: string }).patient_email) {
        (payload as { patient_email?: string }).patient_email = patientEmail;
      }
    }

    let res: ApiResponse<Appointment>;
    try {
      res = await createAppointment(payload);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur réseau';
      if (deferPostCreate && createdIds.length > 0) {
        await runPartialPostCreate(payloads, createdIds);
      }
      return {
        success: false,
        createdIds,
        error: createdIds.length > 0 ? `${msg} (${createdIds.length}/${payloads.length} RDV créés)` : msg,
      };
    }

    if (res.success && res.data?.id) {
      const id = res.data.id;
      createdIds.push(id);
      if (!deferPostCreate) {
        await uploadAppointmentDocuments(id, payload);
      }
    } else {
      const msg = res.error ?? 'Erreur lors de la création';
      if (deferPostCreate && createdIds.length > 0) {
        await runPartialPostCreate(payloads, createdIds);
      }
      return {
        success: false,
        createdIds,
        error: createdIds.length > 0 ? `${msg} (${createdIds.length}/${payloads.length} RDV créés)` : msg,
      };
    }
  }

  if (deferPostCreate) {
    for (let i = 0; i < payloads.length; i++) {
      await uploadAppointmentDocuments(createdIds[i], payloads[i]);
    }
  }

  return { success: true, createdIds };
}

async function runPartialPostCreate(payloads: AppointmentCreatePayload[], ids: string[]) {
  for (let j = 0; j < ids.length; j++) {
    try {
      await uploadAppointmentDocuments(ids[j], payloads[j]);
    } catch (e) {
      if (__DEV__) console.warn('[post-create partial]', e);
    }
  }
}
