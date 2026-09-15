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
