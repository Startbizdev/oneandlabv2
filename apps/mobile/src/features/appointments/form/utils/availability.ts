import { AVAILABILITY_MIN_SPAN_HOURS } from '@oneandlab/shared-constants';

export type AvailabilityType = 'all_day' | 'custom';

export const DEFAULT_AVAILABILITY_RANGE: [number, number] = [9, 11];

export function parseAvailabilityField(
  raw: unknown,
  legacy?: {
    availability_type?: unknown;
    availabilityRange?: unknown;
  },
): { type: AvailabilityType; range: [number, number] } {
  const fallbackRange = normalizeAvailabilityRange(legacy?.availabilityRange) ?? DEFAULT_AVAILABILITY_RANGE;
  const legacyType =
    legacy?.availability_type === 'custom' || legacy?.availability_type === 'all_day'
      ? (legacy.availability_type as AvailabilityType)
      : null;

  if (raw == null || raw === '') {
    return legacyType
      ? { type: legacyType, range: fallbackRange }
      : { type: 'all_day' as const, range: fallbackRange };
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
        return { type: 'custom', range: [lo, hi] };
      }
    }
    if (parsed?.type === 'all_day') {
      return { type: 'all_day', range: fallbackRange };
    }
  } catch {
    /* default */
  }
  return legacyType
    ? { type: legacyType, range: fallbackRange }
    : { type: 'all_day' as const, range: fallbackRange };
}

function normalizeAvailabilityRange(raw: unknown): [number, number] | null {
  if (!Array.isArray(raw) || raw.length !== 2) return null;
  const lo = Number(raw[0]);
  const hi = Number(raw[1]);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return [lo, hi];
}

export function buildAvailabilityPayload(
  type: AvailabilityType,
  range: [number, number],
): string {
  if (type === 'all_day') {
    return JSON.stringify({ type: 'all_day' });
  }
  return JSON.stringify({ type: 'custom', range: [Number(range[0]), Number(range[1])] });
}

export function buildAvailabilityFormPatch(
  type: AvailabilityType,
  range: [number, number],
): {
  availability: string;
  availability_type: AvailabilityType;
  availabilityRange: [number, number];
} {
  return {
    availability: buildAvailabilityPayload(type, range),
    availability_type: type,
    availabilityRange: range,
  };
}

export function isAvailabilityValid(type: AvailabilityType, range: [number, number]): boolean {
  if (type === 'all_day') return true;
  return range[1] - range[0] >= AVAILABILITY_MIN_SPAN_HOURS;
}
