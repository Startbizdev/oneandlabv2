/** Booking hours are wall-clock hours in France, regardless of the device timezone. */
export function parisBookingClock(at = Date.now()): { date: string; nextHour: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(at));
  const part = (key: string) => parts.find((p) => p.type === key)!.value;
  const partialHour = Number(part('minute')) > 0 || Number(part('second')) > 0 || at % 1000 > 0;
  return { date: `${part('year')}-${part('month')}-${part('day')}`, nextHour: Number(part('hour')) + (partialHour ? 1 : 0) };
}

export function bookingSlotMinHourParis(scheduledAt: string | null | undefined, maxHour: number, minHour = 6, at = Date.now()): number {
  const clock = parisBookingClock(at);
  if (String(scheduledAt ?? '').slice(0, 10) !== clock.date) return minHour;
  // A minimum equal to the maximum means today has no remaining full-hour slot.
  return Math.min(maxHour, Math.max(minHour, clock.nextHour));
}

/** Keep the existing lead time, but exclude today once no full-hour slot remains. */
export function bookingLeadTimeAfterClosing(maxHour: number, configuredLead = 0, at = Date.now()): number {
  let hours = Number.isFinite(configuredLead) ? Math.max(0, Math.floor(configuredLead)) : 0;
  const clock = parisBookingClock(at);
  if (clock.nextHour < maxHour) return hours;
  while (parisBookingClock(at + hours * 3_600_000).date === clock.date) hours++;
  return hours;
}

export function nextBookingDateAfterClosing(
  scheduledAt: string | null | undefined,
  maxHour: number,
  options: { minLeadTimeHours?: number | null; acceptSaturday?: boolean; acceptSunday?: boolean } = {},
  at = Date.now(),
): string | null {
  const clock = parisBookingClock(at);
  if (String(scheduledAt ?? '').slice(0, 10) !== clock.date || clock.nextHour < maxHour) return null;
  const lead = bookingLeadTimeAfterClosing(maxHour, options.minLeadTimeHours ?? 0, at);
  const candidate = new Date(`${parisBookingClock(at + lead * 3_600_000).date}T12:00:00Z`);
  while ((candidate.getUTCDay() === 6 && options.acceptSaturday === false)
    || (candidate.getUTCDay() === 0 && options.acceptSunday === false)) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }
  return candidate.toISOString().slice(0, 10);
}
