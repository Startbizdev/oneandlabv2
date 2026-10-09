export type BookingDateSelectionMode = 'single' | 'multiple';

function dateKey(value: string | null | undefined): string {
  const raw = String(value ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(raw)) return '';
  return raw.slice(0, 10);
}

export function selectedBookingDates(primary: string | null | undefined, extras: string[] | undefined): string[] {
  const keys = [dateKey(primary), ...(extras ?? []).map((day) => dateKey(day))].filter((day) => day !== '');
  return [...new Set(keys)].sort();
}

export function bookingDatesToSlice(dates: string[]): {
  scheduled_at: string;
  extra_scheduled_dates: string[];
} {
  const sorted = [...new Set(dates.map((day) => dateKey(day)).filter((day) => day !== ''))].sort();
  return {
    scheduled_at: sorted[0] ?? '',
    extra_scheduled_dates: sorted.slice(1),
  };
}

export function toggleBookingDate(
  primary: string | null | undefined,
  extras: string[] | undefined,
  iso: string,
): { scheduled_at: string; extra_scheduled_dates: string[] } {
  const day = dateKey(iso);
  if (day === '') return bookingDatesToSlice(selectedBookingDates(primary, extras));
  const current = selectedBookingDates(primary, extras);
  const next = current.includes(day) ? current.filter((item) => item !== day) : [...current, day];
  return bookingDatesToSlice(next);
}
