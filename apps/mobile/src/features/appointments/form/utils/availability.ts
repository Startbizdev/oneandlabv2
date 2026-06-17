import {
  PATIENT_VIP_MAX_HOUR,
  PATIENT_VIP_MIN_HOUR,
  PATIENT_VIP_MINUTE_STEPS,
} from '@oneandlab/shared-constants';
import { AVAILABILITY_MIN_SPAN_HOURS } from '@oneandlab/shared-constants';

export type AvailabilityType = 'all_day' | 'custom' | 'urgent';
export type UrgentTimingMode = 'asap' | 'scheduled';

export const DEFAULT_AVAILABILITY_RANGE: [number, number] = [9, 11];
export const DEFAULT_URGENT_HOUR = 9;
export const DEFAULT_URGENT_MINUTE = 0;

export function parseAvailabilityField(
  raw: unknown,
  legacy?: {
    availability_type?: unknown;
    availabilityRange?: unknown;
    urgentHour?: unknown;
    urgentMinute?: unknown;
    urgentTimingMode?: unknown;
  },
): {
  type: AvailabilityType;
  range: [number, number];
  urgentHour: number;
  urgentMinute: number;
  urgentTimingMode: UrgentTimingMode;
} {
  const fallbackRange = normalizeAvailabilityRange(legacy?.availabilityRange) ?? DEFAULT_AVAILABILITY_RANGE;
  const legacyType =
    legacy?.availability_type === 'custom' ||
    legacy?.availability_type === 'all_day' ||
    legacy?.availability_type === 'urgent'
      ? (legacy.availability_type as AvailabilityType)
      : null;

  let urgentHour = clampUrgentHour(legacy?.urgentHour ?? DEFAULT_URGENT_HOUR);
  let urgentMinute = clampUrgentMinute(legacy?.urgentMinute ?? DEFAULT_URGENT_MINUTE);
  let urgentTimingMode: UrgentTimingMode =
    legacy?.urgentTimingMode === 'asap' ? 'asap' : 'scheduled';

  if (raw == null || raw === '') {
    return {
      type: legacyType ?? 'all_day',
      range: fallbackRange,
      urgentHour,
      urgentMinute,
      urgentTimingMode,
    };
  }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (
      parsed?.type === 'custom' &&
      Array.isArray(parsed.range) &&
      parsed.range.length === 2
    ) {
      const lo = Number(parsed.range[0]);
      const hi = Number(parsed.range[1]);
      if (Number.isFinite(lo) && Number.isFinite(hi)) {
        return { type: 'custom', range: [lo, hi], urgentHour, urgentMinute, urgentTimingMode };
      }
    }
    if (parsed?.type === 'all_day') {
      return { type: 'all_day', range: fallbackRange, urgentHour, urgentMinute, urgentTimingMode };
    }
    if (parsed?.type === 'urgent') {
      if (parsed.asap) {
        urgentTimingMode = 'asap';
      } else {
        urgentTimingMode = 'scheduled';
        urgentHour = clampUrgentHour(parsed.hour);
        urgentMinute = clampUrgentMinute(parsed.minute);
      }
      return { type: 'urgent', range: fallbackRange, urgentHour, urgentMinute, urgentTimingMode };
    }
  } catch {
    /* default */
  }
  return {
    type: legacyType ?? 'all_day',
    range: fallbackRange,
    urgentHour,
    urgentMinute,
    urgentTimingMode,
  };
}

function normalizeAvailabilityRange(raw: unknown): [number, number] | null {
  if (!Array.isArray(raw) || raw.length !== 2) return null;
  const lo = Number(raw[0]);
  const hi = Number(raw[1]);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return [lo, hi];
}

function clampUrgentHour(raw: unknown): number {
  const h = Math.floor(Number(raw) || PATIENT_VIP_MIN_HOUR);
  return Math.min(PATIENT_VIP_MAX_HOUR, Math.max(PATIENT_VIP_MIN_HOUR, h));
}

function clampUrgentMinute(raw: unknown): number {
  const m = Number(raw) || 0;
  const steps = PATIENT_VIP_MINUTE_STEPS as readonly number[];
  if (steps.includes(m)) return m;
  return steps.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a), 0);
}

export function buildAvailabilityPayload(
  type: AvailabilityType,
  range: [number, number],
  urgent?: { mode: UrgentTimingMode; hour: number; minute: number },
): string {
  if (type === 'all_day') {
    return JSON.stringify({ type: 'all_day' });
  }
  if (type === 'urgent') {
    const mode = urgent?.mode ?? 'scheduled';
    if (mode === 'asap') {
      return JSON.stringify({ type: 'urgent', asap: true });
    }
    return JSON.stringify({
      type: 'urgent',
      asap: false,
      hour: clampUrgentHour(urgent?.hour),
      minute: clampUrgentMinute(urgent?.minute),
    });
  }
  return JSON.stringify({ type: 'custom', range: [Number(range[0]), Number(range[1])] });
}

export function buildAvailabilityFormPatch(
  type: AvailabilityType,
  range: [number, number],
  urgent?: { mode: UrgentTimingMode; hour: number; minute: number },
): {
  availability: string;
  availability_type: AvailabilityType;
  availabilityRange: [number, number];
  urgentHour?: number;
  urgentMinute?: number;
  urgentTimingMode?: UrgentTimingMode;
  patient_urgency?: Record<string, unknown>;
} {
  const patch: ReturnType<typeof buildAvailabilityFormPatch> = {
    availability: buildAvailabilityPayload(type, range, urgent),
    availability_type: type,
    availabilityRange: range,
  };
  if (type === 'urgent' && urgent) {
    patch.urgentHour = clampUrgentHour(urgent.hour);
    patch.urgentMinute = clampUrgentMinute(urgent.minute);
    patch.urgentTimingMode = urgent.mode;
    patch.patient_urgency =
      urgent.mode === 'asap'
        ? { enabled: true, asap: true }
        : {
            enabled: true,
            asap: false,
            hour: patch.urgentHour,
            minute: patch.urgentMinute,
          };
  }
  return patch;
}

export function isAvailabilityValid(
  type: AvailabilityType,
  range: [number, number],
  urgent?: { mode: UrgentTimingMode; hour: number; minute: number },
): boolean {
  if (type === 'all_day') return true;
  if (type === 'urgent') {
    if (urgent?.mode === 'asap') return true;
    const hour = clampUrgentHour(urgent?.hour);
    const minute = clampUrgentMinute(urgent?.minute);
    return hour >= PATIENT_VIP_MIN_HOUR && hour <= PATIENT_VIP_MAX_HOUR;
  }
  return range[1] - range[0] >= AVAILABILITY_MIN_SPAN_HOURS;
}
