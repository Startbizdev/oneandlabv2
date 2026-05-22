import type { Appointment } from '@oneandlab/shared-types';

export type PreleveurBannerPhase = 'hidden' | 'en_route' | 'arrive';

const PARIS_TZ = 'Europe/Paris';

function parisParts(ms: number): { ymd: string; minutes: number } | null {
  try {
    const fmt = new Intl.DateTimeFormat('fr-FR', {
      timeZone: PARIS_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(new Date(ms));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    const ymd = `${get('year')}-${get('month')}-${get('day')}`;
    const minutes = Number(get('hour')) * 60 + Number(get('minute'));
    return { ymd, minutes };
  } catch {
    return null;
  }
}

function appointmentYmd(appt: Appointment): string | null {
  const raw = String(appt.scheduled_at ?? '').trim();
  if (!raw) return null;
  const p = parisParts(new Date(raw).getTime());
  return p?.ymd ?? null;
}

function slotMinutes(appt: Appointment): [number, number] | null {
  const avail = appt.form_data?.availability;
  try {
    const parsed = typeof avail === 'string' ? JSON.parse(avail) : avail;
    if (parsed?.type === 'custom' && Array.isArray(parsed.range) && parsed.range.length >= 2) {
      const a = Number(parsed.range[0]) * 60;
      const b = Number(parsed.range[1]) * 60;
      if (!Number.isNaN(a) && !Number.isNaN(b)) return [a, b];
    }
  } catch {
    /* ignore */
  }
  const raw = String(appt.scheduled_at ?? '').trim();
  if (!raw) return null;
  const p = parisParts(new Date(raw).getTime());
  if (!p) return null;
  const start = p.minutes;
  const ext = appt as Appointment & { duration_minutes?: number };
  const duration = Number(ext.duration_minutes ?? 60);
  return [start, start + Math.max(30, duration)];
}

export function computePreleveurBannerPhase(appt: Appointment, nowMs: number): PreleveurBannerPhase {
  if (appt.type !== 'blood_test') return 'hidden';
  const status = String(appt.status ?? '').toLowerCase();
  if (['completed', 'canceled', 'cancelled', 'expired', 'refused'].includes(status)) return 'hidden';
  const ext = appt as Appointment & {
    assigned_to_display_name?: string;
    assigned_to_name?: string;
  };
  const name = String(ext.assigned_to_display_name ?? ext.assigned_to_name ?? '').trim();
  if (!name) return 'hidden';

  const now = parisParts(nowMs);
  const ymd = appointmentYmd(appt);
  const slot = slotMinutes(appt);
  if (!now || !ymd || !slot || now.ymd !== ymd) return 'hidden';

  const enRouteAt = Math.max(0, slot[0] - 30);
  if (now.minutes < enRouteAt) return 'hidden';
  if (now.minutes < slot[0]) return 'en_route';
  return 'arrive';
}

export function preleveurBannerTitle(appt: Appointment, phase: PreleveurBannerPhase): string {
  const ext = appt as Appointment & {
    assigned_to_display_name?: string;
    assigned_to_name?: string;
  };
  const name = String(ext.assigned_to_display_name ?? ext.assigned_to_name ?? 'Votre préleveur');
  if (phase === 'arrive') return `${name} est sur place`;
  return `${name} est en route`;
}

export function preleveurBannerSubtitle(appt: Appointment, phase: PreleveurBannerPhase): string {
  if (phase === 'arrive') return 'Le préleveur devrait vous contacter à son arrivée.';
  return 'Préparez-vous : le préleveur arrivera dans la plage horaire prévue.';
}
