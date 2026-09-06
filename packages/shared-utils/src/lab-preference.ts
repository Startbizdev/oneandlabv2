import type { LabPreferenceMode } from '@oneandlab/shared-types';

export type { LabPreferenceMode, LabBrandPublic, LabBrandAdmin } from '@oneandlab/shared-types';

export function bloodTestNeedsLabPreferenceStep(
  selectedServices: Array<{ type: string }>,
  opts?: { skipForProviderBooking?: boolean },
): boolean {
  if (opts?.skipForProviderBooking) {
    return false;
  }
  return selectedServices.some((s) => s.type === 'blood_test');
}

export function applyLabPreferenceToPayload(
  payload: Record<string, unknown>,
  mode: LabPreferenceMode,
  brandId?: string | null,
): Record<string, unknown> {
  const formData =
    payload.form_data && typeof payload.form_data === 'object'
      ? { ...(payload.form_data as Record<string, unknown>) }
      : {};
  formData.lab_preference_mode = mode;
  if (mode === 'brand_choice' && brandId) {
    formData.preferred_lab_brand_id = brandId;
    payload.preferred_lab_brand_id = brandId;
    payload.lab_preference_mode = mode;
  } else {
    delete formData.preferred_lab_brand_id;
    delete formData.preferred_lab_brand_name;
    payload.preferred_lab_brand_id = null;
    payload.lab_preference_mode = mode;
  }
  payload.form_data = formData;
  return payload;
}

export function validateLabPreferenceBeforeSubmit(
  selectedServices: Array<{ type: string }>,
  mode: LabPreferenceMode | '',
  brandId: string | null | undefined,
  opts?: { skipForProviderBooking?: boolean },
): string | null {
  if (!bloodTestNeedsLabPreferenceStep(selectedServices, opts)) {
    return null;
  }
  if (mode !== 'platform_match' && mode !== 'brand_choice') {
    return 'Indiquez comment vous souhaitez être pris en charge par un laboratoire.';
  }
  if (mode === 'brand_choice' && (!brandId || String(brandId).trim() === '')) {
    return 'Choisissez votre labo.';
  }
  return null;
}

/** Applique la préférence labo aux payloads prélèvement (parcours patient). */
export function applyLabPreferenceToBloodPayloads(
  payloads: Record<string, unknown>[],
  formData: Record<string, unknown>,
): Record<string, unknown>[] {
  const mode = (formData.lab_preference_mode as LabPreferenceMode) || 'platform_match';
  const brandId = formData.preferred_lab_brand_id as string | null | undefined;
  return payloads.map((payload) => {
    if (payload.type !== 'blood_test') {
      return payload;
    }
    return applyLabPreferenceToPayload(payload, mode, brandId);
  });
}
