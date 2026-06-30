/**
 * Détection / affichage option « Horaire VIP » (ex-urgence patient, prise de sang + Stripe).
 */

/** Préfixe des libellés court / listes (détection + rétrocompat. libellés « Urgent »). */
export const PATIENT_VIP_SLOT_LABEL_PREFIX = 'Horaire VIP';

export function isPatientVipSlotShortLabel(label: string): boolean {
  return label.startsWith(PATIENT_VIP_SLOT_LABEL_PREFIX) || label.startsWith('Urgent');
}

export type UrgentAvailabilityParsed = {
  isUrgent: boolean;
  asap: boolean;
  hour: number | null;
  minute: number | null;
};

function normalizeUrgentMinute(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  const q = Math.round(n / 15) * 15;
  const m = ((q % 60) + 60) % 60;
  return m;
}

/** Parse JSON availability (string ou objet) pour type urgent. */
export function parseUrgentAvailabilityPayload(availability: unknown): UrgentAvailabilityParsed {
  if (availability == null) {
    return { isUrgent: false, asap: false, hour: null, minute: null };
  }
  try {
    let avail: Record<string, unknown> | null = null;
    if (typeof availability === 'string') {
      const t = availability.trim();
      if (!t) return { isUrgent: false, asap: false, hour: null, minute: null };
      avail = JSON.parse(t) as Record<string, unknown>;
    } else if (typeof availability === 'object' && !Array.isArray(availability)) {
      avail = availability as Record<string, unknown>;
    }
    if (!avail) return { isUrgent: false, asap: false, hour: null, minute: null };

    const typ = String(avail.type ?? '').toLowerCase().replace(/-/g, '_');
    if (typ !== 'urgent') return { isUrgent: false, asap: false, hour: null, minute: null };

    const asap =
      avail.asap === true ||
      avail.asap === 'true' ||
      String(avail.mode ?? '') === 'asap';

    const hourN = Number(avail.hour);
    const hour =
      Number.isFinite(hourN) && hourN >= 0 && hourN <= 23 ? Math.floor(hourN) : null;
    const minute = normalizeUrgentMinute(avail.minute);

    return { isUrgent: true, asap, hour, minute };
  } catch {
    return { isUrgent: false, asap: false, hour: null, minute: null };
  }
}

export function isPatientUrgencyBooking(apt: {
  form_data?: { availability?: unknown; patient_urgency?: { enabled?: boolean; paid?: boolean } } | null;
} | null | undefined): boolean {
  if (!apt?.form_data) return false;
  const pu = apt.form_data.patient_urgency;
  if (pu && (pu.enabled === true || pu.paid === true)) return true;
  return parseUrgentAvailabilityPayload(apt.form_data.availability).isUrgent;
}

/** Libellé court créneau Horaire VIP (listes, cartes) — sans la date. */
export function formatPatientUrgentCreneauShortFr(availability: unknown): string {
  const p = parseUrgentAvailabilityPayload(availability);
  if (!p.isUrgent) return '';
  if (p.asap) return `${PATIENT_VIP_SLOT_LABEL_PREFIX} · le plus vite possible`;
  const h = p.hour;
  if (h == null) return PATIENT_VIP_SLOT_LABEL_PREFIX;
  const m = p.minute ?? 0;
  const time =
    m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
  return `${PATIENT_VIP_SLOT_LABEL_PREFIX} · passage vers ${time}`;
}
