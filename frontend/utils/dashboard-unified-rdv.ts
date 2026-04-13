import { AVAILABILITY_MIN_SPAN_HOURS } from '~/constants/availability-slot';
import { isTechnicalPatientEmail } from '~/utils/patient-address-rdv';

export type SelectedServiceInput = {
  id: string;
  type: string;
  name: string;
  category_id: string | null;
  icon?: string;
};

/** Erreur de validation avec ancrage scroll (wizard pro / dashboard). */
export type UnifiedRdvValidationError = {
  message: string;
  /** id d’élément DOM, ex. wizard-rdv-patient-card, wizard-rdv-service-xxx */
  scrollAnchor?: string;
};

const ANCHOR_PATIENT = 'wizard-rdv-patient-card';

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

/**
 * Valide le payload RDV unifié (wizard pro, etc.).
 * Retourne `null` si OK, sinon message + ancrage pour faire défiler vers le bloc concerné.
 */
export type ValidateUnifiedRdvOptions = {
  /** Infirmier / pro : email du patient peut être vide à la création (API patients). */
  patientEmailOptional?: boolean;
};

export function validateUnifiedRdvPayload(
  formData: Record<string, any>,
  selectedServices: SelectedServiceInput[],
  options?: ValidateUnifiedRdvOptions,
): UnifiedRdvValidationError | null {
  const getField = (field: string) => formData?.[field] ?? formData?.form_data?.[field];

  const requiredFields: Record<string, string> = {
    last_name: 'Le nom est obligatoire',
    first_name: 'Le prénom est obligatoire',
    email: "L'email est obligatoire",
    phone: 'Le téléphone est obligatoire',
    gender: 'Le genre est obligatoire',
    birth_date: 'La date de naissance est obligatoire',
    address: "L'adresse est obligatoire",
  };

  for (const [field, message] of Object.entries(requiredFields)) {
    if (field === 'email') {
      const value = getField(field);
      if (isTechnicalPatientEmail(value)) continue;
      if (options?.patientEmailOptional) {
        const v = value != null ? String(value).trim() : '';
        if (v === '') continue;
      }
    }
    const value = getField(field);
    if (
      !value ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0) ||
      (typeof value === 'object' && value !== null && Object.keys(value).length === 0)
    ) {
      return { message, scrollAnchor: field === 'address' ? ANCHOR_PATIENT : ANCHOR_PATIENT };
    }
  }

  const address = getField('address');
  if (addressIsIncomplete(address)) {
    return {
      message:
        "L'adresse du patient est incomplète ou non géolocalisée. Vérifiez la fiche patient ou complétez l'adresse (ville reconnue).",
      scrollAnchor: ANCHOR_PATIENT,
    };
  }

  for (const svc of selectedServices) {
    const svcData = formData?.formDataByService?.[svc.id] ?? {};
    const scheduledAt = svcData.scheduled_at;
    if (!scheduledAt || (typeof scheduledAt === 'string' && scheduledAt.trim() === '')) {
      return {
        message: `La date souhaitée est obligatoire pour « ${svc.name} »`,
        scrollAnchor: `wizard-rdv-service-${svc.id}`,
      };
    }
    const availability = svcData.availability;
    let availabilityValid = false;
    if (availability && typeof availability === 'string' && availability.trim() !== '') {
      try {
        const availabilityData = JSON.parse(availability);
        if (availabilityData && (availabilityData.type === 'custom' || availabilityData.type === 'all_day')) {
          if (availabilityData.type === 'custom') {
            if (availabilityData.range && Array.isArray(availabilityData.range) && availabilityData.range.length === 2) {
              if (availabilityData.range[1] - availabilityData.range[0] >= AVAILABILITY_MIN_SPAN_HOURS) {
                availabilityValid = true;
              } else {
                return {
                  message: `L'écart minimum des créneaux est de ${AVAILABILITY_MIN_SPAN_HOURS} h pour « ${svc.name} »`,
                  scrollAnchor: `wizard-rdv-service-${svc.id}`,
                };
              }
            }
          } else {
            availabilityValid = true;
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

  const formDataByService = formData?.formDataByService ?? {};
  for (const svc of selectedServices) {
    const svcData = formDataByService[svc.id] ?? {};
    if (svc.type === 'blood_test') {
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
        if (svcData.duration_days === 'custom' && (!svcData.custom_days || svcData.custom_days < 1)) {
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
      if (svcData.duration_days !== '1' && svcData.duration_days !== 'to_define' && !svcData.frequency) {
        return {
          message: `Fréquence des passages obligatoire pour « ${svc.name} »`,
          scrollAnchor: `wizard-rdv-service-${svc.id}`,
        };
      }
    }
  }

  return null;
}

export function buildDashboardAppointmentPayloads(
  patientId: string,
  formData: Record<string, any>,
  selectedServices: SelectedServiceInput[],
  ctx: {
    /** Plusieurs lignes : même id pour chaque POST */
    creationBatchId?: string;
    /** Infirmier / lab / sous-compte / pro */
    creatorRole: string;
    creatorUserId: string;
  },
): Record<string, unknown>[] {
  const formDataByService = formData?.formDataByService ?? {};
  const { formDataByService: _fd, selectedServices: _ss, isMultiServices: _im, ...commonForm } = formData ?? {};

  return selectedServices.map((svc) => {
    const svcData = formDataByService[svc.id] ?? {};
    const baseFormData: Record<string, unknown> = {
      ...commonForm,
      address: formData?.address,
      files: svcData.form_data_files ?? {},
      availability: svcData.availability,
      scheduled_at: svcData.scheduled_at,
    };
    if (svc.type === 'blood_test') {
      Object.assign(baseFormData, {
        blood_test_type: svcData.blood_test_type,
        duration_days: svcData.blood_test_type === 'multiple' ? svcData.duration_days : undefined,
        custom_days: svcData.duration_days === 'custom' ? svcData.custom_days : undefined,
      });
    } else {
      Object.assign(baseFormData, {
        duration_days: svcData.duration_days,
        frequency: svcData.frequency,
        custom_days: svcData.duration_days === 'custom' ? svcData.custom_days : undefined,
        preferred_nurse_gender: svcData.preferred_nurse_gender ?? 'any',
      });
    }
    baseFormData.notes = svcData.notes || undefined;
    if (svcData.care_options && Object.keys(svcData.care_options).length) {
      baseFormData.care_options = svcData.care_options;
    }

    const payload: Record<string, unknown> = {
      type: svc.type,
      form_type: svc.type,
      category_id: svc.category_id,
      patient_id: patientId,
      address: formData?.address,
      scheduled_at: svcData.scheduled_at,
      form_data: baseFormData,
      files: svcData.files ?? {},
    };

    if (ctx.creationBatchId) {
      payload.creation_batch_id = ctx.creationBatchId;
    }

    if (
      svc.type === 'blood_test' &&
      (ctx.creatorRole === 'lab' || ctx.creatorRole === 'subaccount')
    ) {
      payload.assigned_lab_id = ctx.creatorUserId;
    }

    return payload;
  });
}
