import type { ClinicalVitalType } from '@oneandlab/shared-types';

type Bounds = { min: number; max: number };

/** Doit rester identique à `ClinicalVitalTypes::META` et `ClinicalVitalService::normalizeInput` (backend/lib/health). */
const VALUE_BOUNDS: Record<ClinicalVitalType, Bounds> = {
  blood_pressure: { min: 40, max: 280 },
  heart_rate: { min: 20, max: 250 },
  temperature: { min: 30, max: 45 },
  spo2: { min: 50, max: 100 },
  blood_glucose: { min: 0.1, max: 6 },
  respiratory_rate: { min: 4, max: 60 },
  pain_scale: { min: 0, max: 10 },
};

const DIASTOLIC_BOUNDS: Bounds = { min: 40, max: 200 };

export type ClinicalVitalFieldErrors = {
  value?: string;
  valueSecondary?: string;
};

export type ClinicalVitalValidation =
  | { ok: true; value: number; valueSecondary: number | null }
  | { ok: false; errors: ClinicalVitalFieldErrors };

function parseDecimal(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (trimmed === '') return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : Number.NaN;
}

function formatBound(n: number): string {
  return String(n).replace('.', ',');
}

function rangeError(label: string, num: number | null, bounds: Bounds, unit: string): string | undefined {
  if (num === null) return `Saisissez ${label}.`;
  if (Number.isNaN(num)) return 'Saisissez un nombre (ex. 12,5).';
  if (num < bounds.min || num > bounds.max) {
    return `Valeur attendue entre ${formatBound(bounds.min)} et ${formatBound(bounds.max)} ${unit}.`;
  }
  return undefined;
}

export function validateClinicalVital(
  type: ClinicalVitalType,
  unit: string,
  rawValue: string,
  rawSecondary: string,
  hasSecondary: boolean,
): ClinicalVitalValidation {
  const value = parseDecimal(rawValue);
  const errors: ClinicalVitalFieldErrors = {
    value: rangeError(hasSecondary ? 'la systolique' : 'une valeur', value, VALUE_BOUNDS[type], unit),
  };

  let secondary: number | null = null;
  if (hasSecondary) {
    secondary = parseDecimal(rawSecondary);
    errors.valueSecondary = rangeError('la diastolique', secondary, DIASTOLIC_BOUNDS, unit);
    if (!errors.value && !errors.valueSecondary && secondary !== null && value !== null && secondary >= value) {
      errors.valueSecondary = 'La diastolique doit être inférieure à la systolique.';
    }
  }

  if (errors.value || errors.valueSecondary || value === null) {
    return { ok: false, errors };
  }
  return { ok: true, value, valueSecondary: hasSecondary ? secondary : null };
}
