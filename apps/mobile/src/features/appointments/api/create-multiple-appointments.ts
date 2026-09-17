import { ResumableAppointmentBatch } from '@oneandlab/shared-utils';
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

/** One attempt belongs to one mounted wizard, never a module-wide patient cache. */
export async function createMultipleAppointments(
  payloads: AppointmentCreatePayload[],
  attempt = new ResumableAppointmentBatch<AppointmentCreatePayload>(),
): Promise<{ success: boolean; createdIds: string[]; error?: string; warning?: string }> {
  const fingerprint = JSON.stringify(payloads, (key, value) =>
    key === 'creation_batch_id' || key === 'creation_batch_size' ? undefined : value,
  );
  const sameTypeMulti = payloads.length > 1 && payloads.every(p => p.type === payloads[0].type);
  const sharedBatch = sameTypeMulti ? payloads[0].creation_batch_id || randomUUID() : undefined;
  const patientEmail = payloads.find(p => p.patient_email)?.patient_email;
  const prepared = payloads.map(payload => ({
    ...payload,
    ...(sharedBatch ? { creation_batch_id: sharedBatch, creation_batch_size: payloads.length, patient_email: payload.patient_email || patientEmail } : {}),
  }));
  const result = await attempt.run(fingerprint, prepared, async (payload, requestId) => {
    const response = await createAppointment({ ...payload, client_request_id: requestId });
    if (!response.success || !response.data?.id) throw new Error(response.error || 'Création impossible');
    return response.data.id;
  }, (payload, id) => uploadAppointmentDocuments(id, payload, attempt));
  if (!result.success && result.creationComplete) {
    return {
      success: true,
      createdIds: result.createdIds,
      warning: result.error ?? 'Certains documents n’ont pas pu être rattachés.',
    };
  }
  return result;
}
