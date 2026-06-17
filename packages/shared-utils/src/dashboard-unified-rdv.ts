/**
 * Port TypeScript de frontend/utils/dashboard-unified-rdv.ts
 */
import { AVAILABILITY_MIN_SPAN_HOURS } from '@oneandlab/shared-constants';
import { isBloodTestAppointment, isNursingAppointment } from './appointment-type-rules';

export type SelectedServiceInput = {
  id: string;
  type: string;
  name: string;
  category_id: string | null;
  icon?: string;
  category_image_url?: string | null;
  skip_prescription_documents?: boolean;
};

export function bloodServicesInSelection(selectedServices: SelectedServiceInput[]): SelectedServiceInput[] {
  return selectedServices.filter((svc) => isBloodTestAppointment(svc.type));
}

export function nursingServicesInSelection(selectedServices: SelectedServiceInput[]): SelectedServiceInput[] {
  return selectedServices.filter((svc) => isNursingAppointment(svc.type));
}

export function shouldMergeNursingServices(selectedServices: SelectedServiceInput[]): boolean {
  return nursingServicesInSelection(selectedServices).length > 1;
}

export function shouldMergeBloodServices(selectedServices: SelectedServiceInput[]): boolean {
  return bloodServicesInSelection(selectedServices).length > 1;
}

/** Services avec carte créneau (fusion multi prélèvements / soins). */
export function servicesRequiringOwnSlots(selectedServices: SelectedServiceInput[]): SelectedServiceInput[] {
  const blood = bloodServicesInSelection(selectedServices);
  const nursing = nursingServicesInSelection(selectedServices);
  let merged = [...selectedServices];
  if (blood.length > 1) {
    const firstBloodId = blood[0].id;
    merged = merged.filter((s) => !isBloodTestAppointment(s.type) || s.id === firstBloodId);
  }
  if (nursing.length > 1) {
    const firstNursingId = nursing[0].id;
    merged = merged.filter(
      (s) => isBloodTestAppointment(s.type) || !isNursingAppointment(s.type) || s.id === firstNursingId,
    );
  }
  const nursingRows = merged.filter((s) => !isBloodTestAppointment(s.type));
  const bloodRows = merged.filter((s) => isBloodTestAppointment(s.type));
  return [...nursingRows, ...bloodRows];
}

export function countGroupedAppointmentPayloads(selectedServices: SelectedServiceInput[]): number {
  const nBlood = bloodServicesInSelection(selectedServices).length;
  const nNursing = nursingServicesInSelection(selectedServices).length;
  const other = selectedServices.length - nBlood - nNursing;
  return other + Math.min(1, nBlood) + Math.min(1, nNursing);
}

export type UnifiedRdvValidationError = {
  message: string;
  scrollAnchor?: string;
};

export type ValidateUnifiedRdvOptions = {
  patientEmailOptional?: boolean;
};

function addressIsIncomplete(address: unknown): boolean {
  if (address == null || typeof address !== 'object') return true;
  const a = address as Record<string, unknown>;
  const label = String(a.label ?? '').trim();
  if (!label) return true;
  const lat = Number(a.lat);
  const lng = Number(a.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;
  if (lat === 0 && lng === 0) return true;
  return false;
}

/** Date seule YYYY-MM-DD → datetime avec heure dérivée de la disponibilité (aligné web). */
export function enrichScheduledAtWithAvailability(
  scheduledAt: unknown,
  availability: unknown,
): string | undefined {
  if (!scheduledAt || String(scheduledAt).trim() === '') return undefined;
  const raw = String(scheduledAt).trim();
  if (raw.includes('T') || (raw.includes(' ') && raw.length > 10)) return raw;

  const dateOnly = raw.slice(0, 10);
  let h = 9;
  let min = 0;

  let availabilityData: { type?: string; range?: number[] } | null = null;
  if (typeof availability === 'string' && availability.trim()) {
    try {
      availabilityData = JSON.parse(availability) as { type?: string; range?: number[] };
    } catch {
      /* ignore */
    }
  } else if (availability && typeof availability === 'object') {
    availabilityData = availability as { type?: string; range?: number[] };
  }

  if (availabilityData?.type === 'all_day') {
    h = 0;
    min = 0;
  } else if (availabilityData?.type === 'urgent') {
    const urgent = availabilityData as { asap?: boolean; hour?: number; minute?: number };
    if (urgent.asap) {
      h = 6;
      min = 0;
    } else {
      h = Math.floor(Number(urgent.hour) || 9);
      const rawM = Number(urgent.minute) || 0;
      min = [0, 15, 30, 45].includes(rawM) ? rawM : 0;
    }
  } else if (availabilityData?.type === 'custom' && availabilityData.range?.length === 2) {
    h = Math.floor(Number(availabilityData.range[0]) || 9);
    min = 0;
  }

  return `${dateOnly} ${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
}

export function validateUnifiedRdvPayload(
  formData: Record<string, unknown>,
  selectedServices: SelectedServiceInput[],
  options?: ValidateUnifiedRdvOptions,
): UnifiedRdvValidationError | null {
  const getField = (field: string) => formData?.[field] ?? (formData?.form_data as Record<string, unknown> | undefined)?.[field];

  const required: Record<string, string> = {
    last_name: 'Le nom est obligatoire',
    first_name: 'Le prénom est obligatoire',
    email: "L'email est obligatoire",
    phone: 'Le téléphone est obligatoire',
    gender: 'Le genre est obligatoire',
    birth_date: 'La date de naissance est obligatoire',
    address: "L'adresse est obligatoire",
  };

  for (const [field, message] of Object.entries(required)) {
    if (field === 'email' && options?.patientEmailOptional) {
      const v = getField(field);
      if (v == null || String(v).trim() === '') continue;
    }
    const value = getField(field);
    if (
      !value ||
      (typeof value === 'string' && value.trim() === '') ||
      (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0)
    ) {
      return { message, scrollAnchor: 'wizard-rdv-patient-card' };
    }
  }

  if (addressIsIncomplete(getField('address'))) {
    return {
      message:
        "L'adresse du patient est incomplète ou non géolocalisée.",
      scrollAnchor: 'wizard-rdv-patient-card',
    };
  }

  const servicesRequiringOwnSlot = servicesRequiringOwnSlots(selectedServices);
  const formDataByService = (formData.formDataByService as Record<string, Record<string, unknown>>) ?? {};

  for (const svc of servicesRequiringOwnSlot) {
    const svcData = formDataByService[svc.id] ?? {};
    if (!svcData.scheduled_at || String(svcData.scheduled_at).trim() === '') {
      return {
        message: `La date souhaitée est obligatoire pour « ${svc.name} »`,
        scrollAnchor: `wizard-rdv-service-${svc.id}`,
      };
    }
    const availability = svcData.availability;
    let availabilityValid = false;
    if (typeof availability === 'string' && availability.trim()) {
      try {
        const availabilityData = JSON.parse(availability) as {
          type?: string;
          range?: number[];
          asap?: boolean;
          hour?: number;
          minute?: number;
        };
        if (availabilityData?.type === 'all_day') availabilityValid = true;
        if (availabilityData?.type === 'urgent') {
          if (availabilityData.asap) {
            availabilityValid = true;
          } else {
            const hour = Number(availabilityData.hour);
            const minute = Number(availabilityData.minute);
            const hourOk = Number.isFinite(hour) && hour >= 6 && hour <= 19;
            const minuteOk = [0, 15, 30, 45].includes(minute);
            if (hourOk && minuteOk) availabilityValid = true;
          }
        }
        if (availabilityData?.type === 'custom' && availabilityData.range?.length === 2) {
          if (availabilityData.range[1] - availabilityData.range[0] >= AVAILABILITY_MIN_SPAN_HOURS) {
            availabilityValid = true;
          } else {
            return {
              message: `L'écart minimum des créneaux est de ${AVAILABILITY_MIN_SPAN_HOURS} h pour « ${svc.name} »`,
              scrollAnchor: `wizard-rdv-service-${svc.id}`,
            };
          }
        }
      } catch {
        /* ignore */
      }
    }
    if (!availabilityValid) {
      return {
        message: `Les créneaux de disponibilité sont obligatoires pour « ${svc.name} »`,
        scrollAnchor: `wizard-rdv-service-${svc.id}`,
      };
    }
  }

  for (const svc of servicesRequiringOwnSlot) {
    const svcData = formDataByService[svc.id] ?? {};
    if (isBloodTestAppointment(svc.type)) {
      if (!svcData.blood_test_type) {
        return {
          message: `Type de prélèvement obligatoire pour « ${svc.name} »`,
          scrollAnchor: `wizard-rdv-service-${svc.id}`,
        };
      }
      if (svcData.blood_test_type === 'multiple') {
        if (!svcData.duration_days) {
          return {
            message: `Nombre de jours obligatoire pour « ${svc.name} »`,
            scrollAnchor: `wizard-rdv-service-${svc.id}`,
          };
        }
        if (svcData.duration_days === 'custom' && (!svcData.custom_days || Number(svcData.custom_days) < 1)) {
          return {
            message: `Indiquez le nombre de jours pour « ${svc.name} »`,
            scrollAnchor: `wizard-rdv-service-${svc.id}`,
          };
        }
      }
    } else {
      if (!svcData.duration_days) {
        return {
          message: `Prise en charge obligatoire pour « ${svc.name} »`,
          scrollAnchor: `wizard-rdv-service-${svc.id}`,
        };
      }
      if (
        svcData.duration_days !== '1' &&
        svcData.duration_days !== 'to_define' &&
        !svcData.frequency
      ) {
        return {
          message: `Fréquence des passages obligatoire pour « ${svc.name} »`,
          scrollAnchor: `wizard-rdv-service-${svc.id}`,
        };
      }
    }
  }

  return null;
}

type DashboardPayloadCtx = {
  creationBatchId?: string;
  creatorRole: string;
  creatorUserId: string;
};

function dashboardSingleServicePayload(
  patientId: string,
  svc: SelectedServiceInput,
  formData: Record<string, unknown>,
  formDataByService: Record<string, Record<string, unknown>>,
  commonForm: Record<string, unknown>,
  ctx: DashboardPayloadCtx,
): Record<string, unknown> {
  const svcData = formDataByService[svc.id] ?? {};
  const enrichedScheduledAt = enrichScheduledAtWithAvailability(
    svcData.scheduled_at,
    svcData.availability,
  );
  const baseFormData: Record<string, unknown> = {
    ...commonForm,
    address: formData.address,
    files: svcData.form_data_files ?? {},
    availability: svcData.availability,
    scheduled_at: enrichedScheduledAt,
  };
  if (isBloodTestAppointment(svc.type)) {
    Object.assign(baseFormData, {
      blood_test_type: svcData.blood_test_type,
      duration_days: svcData.blood_test_type === 'multiple' ? svcData.duration_days : undefined,
      custom_days: svcData.duration_days === 'custom' ? svcData.custom_days : undefined,
    });
    if (svcData.patient_urgency && typeof svcData.patient_urgency === 'object') {
      baseFormData.patient_urgency = svcData.patient_urgency;
    }
  } else {
    Object.assign(baseFormData, {
      duration_days: svcData.duration_days,
      frequency: svcData.frequency,
      custom_days: svcData.duration_days === 'custom' ? svcData.custom_days : undefined,
      preferred_nurse_gender: svcData.preferred_nurse_gender ?? 'any',
    });
  }
  baseFormData.notes = svcData.notes || undefined;
  if (svcData.care_options && Object.keys(svcData.care_options as object).length) {
    baseFormData.care_options = svcData.care_options;
  }

  const payload: Record<string, unknown> = {
    type: svc.type,
    form_type: svc.type,
    category_id: svc.category_id,
    patient_id: patientId,
    address: formData.address,
    scheduled_at: enrichedScheduledAt,
    form_data: baseFormData,
    files: svcData.files ?? {},
  };
  if (ctx.creationBatchId) payload.creation_batch_id = ctx.creationBatchId;
  if (isBloodTestAppointment(svc.type) && (ctx.creatorRole === 'lab' || ctx.creatorRole === 'subaccount')) {
    payload.assigned_lab_id = ctx.creatorUserId;
  }
  if (ctx.creatorRole === 'nurse' && isNursingAppointment(svc.type)) {
    payload.status = 'confirmed';
    payload.assigned_nurse_id = ctx.creatorUserId;
  }
  return payload;
}

function dashboardMergedBloodPayload(
  patientId: string,
  bloodServices: SelectedServiceInput[],
  formData: Record<string, unknown>,
  formDataByService: Record<string, Record<string, unknown>>,
  commonForm: Record<string, unknown>,
  ctx: DashboardPayloadCtx,
): Record<string, unknown> {
  const firstSvc = bloodServices[0];
  const firstData = formDataByService[firstSvc.id] ?? {};
  const enrichedScheduledAt = enrichScheduledAtWithAvailability(
    firstData.scheduled_at,
    firstData.availability,
  );
  const bloodTestItems = bloodServices.map((svc, index) => ({
    category_id: svc.category_id,
    label: svc.name,
    care_options: formDataByService[svc.id]?.care_options ?? {},
    sort_order: index,
  }));
  const baseFormData: Record<string, unknown> = {
    ...commonForm,
    address: formData.address,
    files: firstData.form_data_files ?? {},
    availability: firstData.availability,
    scheduled_at: enrichedScheduledAt,
    blood_test_type: firstData.blood_test_type,
    duration_days: firstData.blood_test_type === 'multiple' ? firstData.duration_days : undefined,
    custom_days: firstData.duration_days === 'custom' ? firstData.custom_days : undefined,
    notes: firstData.notes || undefined,
    blood_test_items: bloodTestItems,
  };
  if (firstData.patient_urgency && typeof firstData.patient_urgency === 'object') {
    baseFormData.patient_urgency = firstData.patient_urgency;
  }
  const payload: Record<string, unknown> = {
    type: 'blood_test',
    form_type: 'blood_test',
    category_id: firstSvc.category_id,
    patient_id: patientId,
    address: formData.address,
    scheduled_at: enrichedScheduledAt,
    form_data: baseFormData,
    files: firstData.files ?? {},
    blood_test_items: bloodTestItems,
  };
  if (ctx.creationBatchId) payload.creation_batch_id = ctx.creationBatchId;
  if (ctx.creatorRole === 'lab' || ctx.creatorRole === 'subaccount') {
    payload.assigned_lab_id = ctx.creatorUserId;
  }
  if (ctx.creatorRole === 'nurse') {
    payload.status = 'confirmed';
    payload.assigned_nurse_id = ctx.creatorUserId;
  }
  return payload;
}

function dashboardMergedNursingPayload(
  patientId: string,
  nursingServices: SelectedServiceInput[],
  formData: Record<string, unknown>,
  formDataByService: Record<string, Record<string, unknown>>,
  commonForm: Record<string, unknown>,
  ctx: DashboardPayloadCtx,
): Record<string, unknown> {
  const firstSvc = nursingServices[0];
  const firstData = formDataByService[firstSvc.id] ?? {};
  const enrichedScheduledAt = enrichScheduledAtWithAvailability(
    firstData.scheduled_at,
    firstData.availability,
  );
  const nursingItems = nursingServices.map((svc, index) => ({
    category_id: svc.category_id,
    label: svc.name,
    care_options: formDataByService[svc.id]?.care_options ?? {},
    sort_order: index,
  }));
  const baseFormData: Record<string, unknown> = {
    ...commonForm,
    address: formData.address,
    files: firstData.form_data_files ?? {},
    availability: firstData.availability,
    scheduled_at: enrichedScheduledAt,
    duration_days: firstData.duration_days,
    frequency: firstData.frequency,
    custom_days: firstData.duration_days === 'custom' ? firstData.custom_days : undefined,
    preferred_nurse_gender: firstData.preferred_nurse_gender ?? 'any',
    notes: firstData.notes || undefined,
    nursing_items: nursingItems,
  };
  if (nursingItems.length > 1) {
    delete baseFormData.care_options;
  } else if (firstData.care_options && Object.keys(firstData.care_options as object).length) {
    baseFormData.care_options = firstData.care_options;
  }
  const payload: Record<string, unknown> = {
    type: 'nursing',
    form_type: 'nursing',
    category_id: firstSvc.category_id,
    patient_id: patientId,
    address: formData.address,
    scheduled_at: enrichedScheduledAt,
    form_data: baseFormData,
    files: firstData.files ?? {},
    nursing_items: nursingItems,
  };
  if (ctx.creationBatchId) payload.creation_batch_id = ctx.creationBatchId;
  if (ctx.creatorRole === 'nurse') {
    payload.status = 'confirmed';
    payload.assigned_nurse_id = ctx.creatorUserId;
  }
  return payload;
}

export function buildDashboardAppointmentPayloads(
  patientId: string,
  formData: Record<string, unknown>,
  selectedServices: SelectedServiceInput[],
  ctx: { creationBatchId?: string; creatorRole: string; creatorUserId: string },
): Record<string, unknown>[] {
  const formDataByService = (formData.formDataByService as Record<string, Record<string, unknown>>) ?? {};
  const { formDataByService: _f, selectedServices: _s, isMultiServices: _m, ...commonForm } = formData;
  const bloodList = bloodServicesInSelection(selectedServices);
  const nursingList = nursingServicesInSelection(selectedServices);
  const mergeBlood = shouldMergeBloodServices(selectedServices);
  const mergeNursing = shouldMergeNursingServices(selectedServices);

  if (!mergeBlood && !mergeNursing) {
    return selectedServices.map((svc) =>
      dashboardSingleServicePayload(patientId, svc, formData, formDataByService, commonForm, ctx),
    );
  }

  const out: Record<string, unknown>[] = [];
  let bloodEmitted = false;
  let nursingEmitted = false;
  for (const svc of selectedServices) {
    if (isBloodTestAppointment(svc.type)) {
      if (!mergeBlood) {
        out.push(dashboardSingleServicePayload(patientId, svc, formData, formDataByService, commonForm, ctx));
      } else if (!bloodEmitted) {
        out.push(
          dashboardMergedBloodPayload(patientId, bloodList, formData, formDataByService, commonForm, ctx),
        );
        bloodEmitted = true;
      }
    } else if (isNursingAppointment(svc.type)) {
      if (!mergeNursing) {
        out.push(dashboardSingleServicePayload(patientId, svc, formData, formDataByService, commonForm, ctx));
      } else if (!nursingEmitted) {
        out.push(
          dashboardMergedNursingPayload(patientId, nursingList, formData, formDataByService, commonForm, ctx),
        );
        nursingEmitted = true;
      }
    } else {
      out.push(dashboardSingleServicePayload(patientId, svc, formData, formDataByService, commonForm, ctx));
    }
  }
  return out;
}
