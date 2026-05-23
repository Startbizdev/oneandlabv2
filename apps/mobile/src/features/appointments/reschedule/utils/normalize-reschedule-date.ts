export function parisDateYmd(value: Date = new Date()): string {
  return value.toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
}

/** Date YYYY-MM-DD utilisable pour la reprise : pas dans le passé (Paris). */
export function normalizeRescheduleDate(dateValue: string | null | undefined): string {
  const todayParis = parisDateYmd();
  if (!dateValue) return todayParis;
  const raw = String(dateValue).trim();
  const originalYmd = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? raw
    : parisDateYmd(new Date(raw));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(originalYmd)) return todayParis;
  return originalYmd < todayParis ? todayParis : originalYmd;
}
