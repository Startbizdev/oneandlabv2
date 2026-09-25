const parisClock = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

/** Resolve a France wall clock independently of the device timezone. Invalid DST gaps stay invalid. */
export function parisWallClockDate(year: number, month: number, day: number, hour = 0, minute = 0, second = 0, millisecond = 0): Date {
  const desired = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  const checked = new Date(desired);
  if (!Number.isFinite(desired) || checked.getUTCFullYear() !== year || checked.getUTCMonth() !== month - 1 || checked.getUTCDate() !== day || hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return new Date(NaN);
  let instant = desired;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = parisClock.formatToParts(new Date(instant));
    const part = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(p => p.type === type)?.value);
    const observed = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'), millisecond);
    if (observed === desired) return new Date(instant);
    instant += desired - observed;
  }
  return new Date(NaN);
}

/** MySQL DATETIME is France-local; an explicit ISO offset denotes an instant. */
export function parseAppointmentDateFrance(value: unknown): Date {
  if (typeof value !== 'string') return new Date(NaN);
  const text = value.trim();
  const local = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?)?$/.exec(text);
  if (local) return parisWallClockDate(Number(local[1]), Number(local[2]), Number(local[3]), Number(local[4] ?? 0), Number(local[5] ?? 0), Number(local[6] ?? 0), Number((local[7] ?? '').padEnd(3, '0').slice(0, 3)));
  if (/(?:z|[+-]\d{2}:?\d{2})$/i.test(text)) return new Date(text);
  return new Date(NaN);
}

export function appointmentDayFrance(value: string | Date | null | undefined): string {
  const date = value instanceof Date ? value : parseAppointmentDateFrance(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = parisClock.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function appointmentTimeFrance(value: string | Date | null | undefined): string {
  const date = value instanceof Date ? value : parseAppointmentDateFrance(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

/** Clé jour calendrier (YYYY-MM-DD), alignée sur le jour civil France des DATETIME MySQL. */
export function calendarDayKeyFromParts(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return appointmentDayFrance(`${year}-${mm}-${dd} 12:00:00`);
}

/** Clé jour pour une cellule de grille (Y/M/D locaux → jour civil France). */
export function calendarDayKeyFromDate(date: Date): string {
  return calendarDayKeyFromParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}
