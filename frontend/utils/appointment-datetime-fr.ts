/**
 * Créneau horaire patient (form_data.availability), aligné sur AppointmentListPage.
 */
export function formatAvailabilitySlotFr(availability: unknown): string {
  if (availability == null) return '';
  try {
    let avail: any = availability;
    if (typeof availability === 'string') {
      const trimmed = availability.trim();
      if (!trimmed) return '';
      avail = JSON.parse(trimmed);
    }
    if (!avail || typeof avail !== 'object') return '';
    if (avail.type === 'all_day') {
      return 'toute la journée';
    }
    if (avail.type === 'custom' && Array.isArray(avail.range) && avail.range.length >= 2) {
      const start = Math.floor(Number(avail.range[0]));
      const end = Math.floor(Number(avail.range[1]));
      if (Number.isNaN(start) || Number.isNaN(end)) return '';
      return `${start}h à ${end}h`;
    }
  } catch {
    // ignore
  }
  return '';
}

/**
 * Date + heure ou créneau pour un SMS au patient (français, fuseau local).
 */
export function formatAppointmentWhenForSms(apt: {
  scheduled_at?: string | null;
  form_data?: { availability?: unknown } | null;
}): string {
  if (!apt?.scheduled_at) return '';
  let d: Date;
  try {
    d = new Date(apt.scheduled_at);
    if (Number.isNaN(d.getTime())) return String(apt.scheduled_at);
  } catch {
    return String(apt.scheduled_at);
  }

  const datePart = d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const slot = formatAvailabilitySlotFr(apt.form_data?.availability);
  if (slot === 'toute la journée') {
    return `${datePart} (${slot})`;
  }
  if (slot) {
    return `${datePart}, créneau ${slot}`;
  }

  const timePart = d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} à ${timePart}`;
}
