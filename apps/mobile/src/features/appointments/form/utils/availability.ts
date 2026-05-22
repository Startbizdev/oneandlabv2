import { AVAILABILITY_MIN_SPAN_HOURS } from '@oneandlab/shared-constants';

export function buildAvailabilityPayload(
  type: 'all_day' | 'custom',
  range: [number, number],
): string {
  if (type === 'all_day') {
    return JSON.stringify({ type: 'all_day' });
  }
  return JSON.stringify({ type: 'custom', range: [Number(range[0]), Number(range[1])] });
}

export function isAvailabilityValid(type: 'all_day' | 'custom', range: [number, number]): boolean {
  if (type === 'all_day') return true;
  return range[1] - range[0] >= AVAILABILITY_MIN_SPAN_HOURS;
}
