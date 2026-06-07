import dayjs from 'dayjs';

const PARIS_OFFSET_HINT = 'Europe/Paris';

/** Première date sélectionnable (aujourd’hui + délai minimal en heures). */
export function bookingMinDate(minLeadTimeHours = 0): dayjs.Dayjs {
  const h = Number(minLeadTimeHours);
  if (Number.isFinite(h) && h > 0) {
    return dayjs().add(Math.floor(h), 'hour').startOf('day');
  }
  return dayjs().startOf('day');
}

export function isBookingDateUnavailable(
  date: dayjs.Dayjs,
  opts: { acceptSaturday?: boolean; acceptSunday?: boolean } = {},
): boolean {
  const acceptSaturday = opts.acceptSaturday !== false;
  const acceptSunday = opts.acceptSunday !== false;
  const dow = date.day();
  if (dow === 0 && !acceptSunday) return true;
  if (dow === 6 && !acceptSaturday) return true;
  return false;
}

/** Génère N jours à partir de la date min. */
export function buildBookingDayList(count = 60, minLeadTimeHours = 0): dayjs.Dayjs[] {
  const start = bookingMinDate(minLeadTimeHours);
  return Array.from({ length: count }, (_, i) => start.add(i, 'day'));
}

/** Découpe les jours en pages (ex. 10 jours = grille 5×2). */
export function buildBookingDaySlides(
  slideCount: number,
  daysPerSlide: number,
  minLeadTimeHours = 0,
): dayjs.Dayjs[][] {
  const days = buildBookingDayList(slideCount * daysPerSlide, minLeadTimeHours);
  const slides: dayjs.Dayjs[][] = [];
  for (let i = 0; i < days.length; i += daysPerSlide) {
    slides.push(days.slice(i, i + daysPerSlide));
  }
  return slides;
}

export function slideIndexForBookingDate(
  date: dayjs.Dayjs,
  daysPerSlide: number,
  minLeadTimeHours = 0,
): number | null {
  const min = bookingMinDate(minLeadTimeHours);
  const diff = date.startOf('day').diff(min.startOf('day'), 'day');
  if (diff < 0) return null;
  return Math.floor(diff / daysPerSlide);
}

export function isBookingDayDisabled(
  date: dayjs.Dayjs,
  minLeadTimeHours = 0,
  opts: { acceptSaturday?: boolean; acceptSunday?: boolean } = {},
): boolean {
  if (date.isBefore(bookingMinDate(minLeadTimeHours), 'day')) return true;
  return isBookingDateUnavailable(date, opts);
}

export function dateToIsoDay(d: dayjs.Dayjs): string {
  return d.format('YYYY-MM-DD');
}

export function parseIsoDay(value: string | null | undefined): dayjs.Dayjs | null {
  if (!value?.trim()) return null;
  const raw = value.trim().slice(0, 10);
  const parsed = dayjs(raw, 'YYYY-MM-DD', true);
  return parsed.isValid() ? parsed : null;
}

export function formatBookingDayLabel(d: dayjs.Dayjs): { weekday: string; day: string; month: string } {
  const weekday = d.locale('fr').format('ddd').replace('.', '');
  const month = d.locale('fr').format('MMM').replace('.', '');
  return { weekday, day: String(d.date()), month };
}

/** Libellé court pour une tuile jour (jour + abréviation). */
export function formatBookingDayCell(d: dayjs.Dayjs): { weekday: string; day: string } {
  const weekday = d.locale('fr').format('ddd').replace('.', '');
  return { weekday, day: String(d.date()) };
}

/** Période affichée au-dessus de la grille (ex. « 7 – 16 juin 2026 »). */
export function formatBookingSlidePeriod(days: dayjs.Dayjs[]): string {
  if (days.length === 0) return '';
  const first = days[0].locale('fr');
  const last = days[days.length - 1].locale('fr');
  if (first.isSame(last, 'day')) {
    return first.format('dddd D MMMM YYYY');
  }
  if (first.isSame(last, 'month')) {
    return `${first.format('D')} – ${last.format('D MMMM YYYY')}`;
  }
  if (first.isSame(last, 'year')) {
    return `${first.format('D MMM')} – ${last.format('D MMM YYYY')}`;
  }
  return `${first.format('D MMM YYYY')} – ${last.format('D MMM YYYY')}`;
}

/** Récap sous la grille pour la date sélectionnée. */
export function formatBookingSelectedDay(d: dayjs.Dayjs): string {
  return d.locale('fr').format('dddd D MMMM');
}

export { PARIS_OFFSET_HINT };
