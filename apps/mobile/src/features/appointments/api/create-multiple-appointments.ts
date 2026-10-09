import { appointmentCreateErrorResolver } from '@oneandlab/shared-api';
import { appointmentPayloadsShareCreationBatch, ResumableAppointmentBatch, runStaffBookingBatch } from '@oneandlab/shared-utils';
import { apiErrorMessage } from '@/lib/errors/handle-api-error';
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

export type CreateMultipleAppointmentsResult = {
  success: boolean;
  createdIds: string[];
  error?: string;
  warning?: string;
  fallbackList?: boolean;
};

/** One attempt belongs to one mounted wizard, never a module-wide patient cache. */
export async function createMultipleAppointments(
  payloads: AppointmentCreatePayload[],
  attempt = new ResumableAppointmentBatch<AppointmentCreatePayload>(),
): Promise<CreateMultipleAppointmentsResult> {
  const fingerprint = JSON.stringify(payloads, (key, value) =>
    key === 'creation_batch_id' || key === 'creation_batch_size' ? undefined : value,
  );
  const sameTypeMulti = appointmentPayloadsShareCreationBatch(payloads);
  const sharedBatch = sameTypeMulti ? payloads[0].creation_batch_id || randomUUID() : undefined;
  const patientEmail = payloads.find(p => p.patient_email)?.patient_email;
  const prepared = payloads.map(payload => ({
    ...payload,
    ...(sharedBatch ? { creation_batch_id: sharedBatch, creation_batch_size: payloads.length, patient_email: payload.patient_email || patientEmail } : {}),
  }));
  return runStaffBookingBatch(
    attempt,
    fingerprint,
    prepared,
    async (payload, requestId) => {
      let response: Awaited<ReturnType<typeof createAppointment>>;
      try {
        response = await createAppointment({ ...payload, client_request_id: requestId });
      } catch (e) {
        throw new Error(apiErrorMessage(e, appointmentCreateErrorResolver(payload), 'Création impossible'));
      }
      if (!response.success || !response.data?.id) throw new Error(response.error || 'Création impossible');
      return response.data.id;
    },
    (payload, id) => uploadAppointmentDocuments(id, payload, attempt),
  );
}
