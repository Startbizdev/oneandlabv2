/** API history contains both numbers and strings for a care duration. */
export function careDurationInDays(duration: unknown, customDays?: unknown): number | null {
  const raw = typeof duration === 'string' ? duration.trim() : typeof duration === 'number' ? String(duration) : '';
  if (!raw || raw === 'to_define') return null;
  if (raw === '60+') return 60;
  const value = raw === 'custom' ? customDays : raw;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const days = Number(value);
  return Number.isSafeInteger(days) && days > 0 ? days : null;
}
