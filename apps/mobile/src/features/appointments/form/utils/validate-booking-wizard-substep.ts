import { AVAILABILITY_MIN_SPAN_HOURS, PATIENT_VIP_MAX_HOUR, PATIENT_VIP_MIN_HOUR } from '@oneandlab/shared-constants';
import {
  isBloodTestAppointment,
  isNursingAppointment,
  validateUnifiedRdvPayload,
  type SelectedServiceInput,
} from '@oneandlab/shared-utils';

export function validateBookingWizardSubstep(
  section: 'slot-datetime' | 'documents' | 'personal',
  opts: {
    slotRows: SelectedServiceInput[];
    documentsSlotRows: SelectedServiceInput[];
    wizardIndex: number;
    formDataByService: Record<string, Record<string, unknown>>;
    mode: 'patient' | 'dashboard';
    patientMode?: 'existing' | 'new';
    selectedPatientId?: string;
    consent?: boolean;
    patientFormData?: Record<string, unknown>;
    selectedServices?: SelectedServiceInput[];
    patientEmailOptional?: boolean;
  },
): string[] {
  const missing: string[] = [];
  const { slotRows, documentsSlotRows, wizardIndex, formDataByService } = opts;

  if (section === 'slot-datetime') {
    const svc = slotRows[wizardIndex];
    if (!svc) return missing;
    const svcData = formDataByService[svc.id] ?? {};
    const svcName = svc.name || 'ce soin';
    if (!svcData.scheduled_at || String(svcData.scheduled_at).trim() === '') {
      missing.push(`La date souhaitée est obligatoire pour ${svcName}`);
    }
    pushAvailabilityErrors(svcData, svcName, missing);
    pushServiceBusinessErrors(svc, svcData, svcName, missing);
    return missing;
  }

  if (section === 'personal') {
    if (!opts.consent) {
      missing.push(
        opts.mode === 'patient'
          ? 'Veuillez accepter la politique de confidentialité.'
          : 'Veuillez accepter les conditions RGPD.',
      );
    }
    if (opts.mode === 'dashboard' && opts.patientMode === 'existing' && !opts.selectedPatientId) {
      missing.push('Veuillez sélectionner un patient dans la liste.');
    }
    if (opts.patientFormData && opts.selectedServices?.length) {
      const payloadErr = validateUnifiedRdvPayload(
        {
          ...opts.patientFormData,
          formDataByService: opts.formDataByService,
        },
        opts.selectedServices,
        { patientEmailOptional: opts.patientEmailOptional },
      );
      if (payloadErr?.message) missing.push(payloadErr.message);
    }
  }

  return missing;
}

function pushAvailabilityErrors(
  svcData: Record<string, unknown>,
  svcName: string,
  missing: string[],
) {
  let availabilityValid = false;
  try {
    const raw = svcData.availability;
    const availabilityData: { type?: string; range?: number[] } | null =
      typeof raw === 'string' && raw
        ? (JSON.parse(raw) as { type?: string; range?: number[] })
        : raw && typeof raw === 'object'
          ? (raw as { type?: string; range?: number[] })
          : null;
    if (availabilityData) {
      if (availabilityData.type === 'all_day') {
        availabilityValid = true;
      } else if (availabilityData.type === 'urgent') {
        const urgent = availabilityData as { asap?: boolean; hour?: number; minute?: number };
        if (urgent.asap) {
          availabilityValid = true;
        } else {
          const hour = Number(urgent.hour);
          const minute = Number(urgent.minute);
          const hourOk = Number.isFinite(hour) && hour >= PATIENT_VIP_MIN_HOUR && hour <= PATIENT_VIP_MAX_HOUR;
          const minuteOk = [0, 15, 30, 45].includes(minute);
          if (hourOk && minuteOk) availabilityValid = true;
          else missing.push(`Créneau Horaire VIP invalide pour ${svcName}`);
        }
      } else if (availabilityData.type === 'custom' && availabilityData.range?.length === 2) {
        if (availabilityData.range[1] - availabilityData.range[0] >= AVAILABILITY_MIN_SPAN_HOURS) {
          availabilityValid = true;
        } else {
          missing.push(
            `L’écart minimum des créneaux est de ${AVAILABILITY_MIN_SPAN_HOURS} h pour ${svcName}`,
          );
        }
      }
    }
  } catch {
    /* ignore */
  }
  if (!availabilityValid && !missing.some((m) => m.includes(svcName) && m.includes('créneaux'))) {
    missing.push(`Les créneaux de disponibilité sont obligatoires pour ${svcName}`);
  }
}

function pushServiceBusinessErrors(
  svc: SelectedServiceInput,
  svcData: Record<string, unknown>,
  svcName: string,
  missing: string[],
) {
  if (isBloodTestAppointment(svc.type)) {
    if (!svcData.blood_test_type) {
      missing.push(`Type de prélèvement obligatoire pour ${svcName}`);
    } else if (svcData.blood_test_type === 'multiple') {
      if (!svcData.duration_days) missing.push(`Nombre de jours obligatoire pour ${svcName}`);
      if (svcData.duration_days === 'custom' && (!svcData.custom_days || Number(svcData.custom_days) < 1)) {
        missing.push(`Indiquez le nombre de jours pour ${svcName}`);
      }
    }
  } else if (isNursingAppointment(svc.type)) {
    if (!svcData.duration_days) {
      missing.push(`Prise en charge obligatoire pour ${svcName}`);
    } else if (
      svcData.duration_days !== '1' &&
      svcData.duration_days !== 'to_define' &&
      !svcData.frequency
    ) {
      missing.push(`Fréquence des passages obligatoire pour ${svcName}`);
    }
  }
}
