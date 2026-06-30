/**
 * Adresse patient pour RDV (wizard pro / formulaire dashboard) :
 * parse JSON / chaîne / objet + complétion coords via API BAN si besoin.
 * Aligné sur AppointmentForm.applyPatientAddressToForm.
 */

export type ParsedPatientAddress = { label: string; lat?: number; lng?: number; complement?: string };

export function parseRawPatientAddress(raw: unknown): ParsedPatientAddress | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return null;
    try {
      const j = JSON.parse(t) as Record<string, unknown>;
      if (j && typeof j === 'object' && !Array.isArray(j)) {
        return {
          label: String(j.label ?? ''),
          lat: typeof j.lat === 'number' ? j.lat : undefined,
          lng: typeof j.lng === 'number' ? j.lng : undefined,
          complement: typeof j.complement === 'string' ? j.complement : undefined,
        };
      }
    } catch {
      return { label: t };
    }
    return { label: t };
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    return {
      label: String(o.label ?? ''),
      lat: typeof o.lat === 'number' ? o.lat : undefined,
      lng: typeof o.lng === 'number' ? o.lng : undefined,
      complement: typeof o.complement === 'string' ? o.complement : undefined,
    };
  }
  return null;
}

/** Email technique patient sans boîte réelle (création pro / infirmier). */
export function isTechnicalPatientEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  return email.trim().toLowerCase().endsWith('@patients.internal.local');
}

/**
 * Dernière adresse e-mail trouvée dans une phrase (ex. texte API `email_display`).
 */
export function extractEmailFromDisplayLine(s: string): string | null {
  const emails = s.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  return emails && emails.length ? emails[emails.length - 1]! : null;
}

/**
 * Libellé à afficher pour le patient : jamais l’email technique `delegated-…@patients.internal.local`.
 * Utilise `email_display` renvoyé par l’API (/auth/me, /users/:id) lorsque présent.
 */
export function patientUiEmailLine(user: {
  email?: string | null;
  email_display?: string | null;
}): string {
  const raw = typeof user.email === 'string' ? user.email.trim() : '';
  if (!raw) return '';
  if (isTechnicalPatientEmail(raw)) {
    const d = typeof user.email_display === 'string' ? user.email_display.trim() : '';
    if (d) return d;
    return 'Sans adresse e-mail personnelle. Les messages passent par le professionnel de santé qui a créé le dossier.';
  }
  return raw;
}

/**
 * Ligne « Email » dans le détail RDV côté patient : même e-mail technique que le compte → message API ;
 * sinon e-mail réel cliquable ; e-mail technique sans correspondance → phrase explicative.
 */
export function formDataEmailDisplayForPatientView(opts: {
  formEmail: unknown;
  viewerUser: { email?: string | null; email_display?: string | null } | null;
}): { text: string; href: string | null } {
  const fe = typeof opts.formEmail === 'string' ? opts.formEmail.trim() : '';
  if (!fe) return { text: '', href: null };
  const vu = opts.viewerUser;
  const ve = typeof vu?.email === 'string' ? vu.email.trim() : '';
  if (isTechnicalPatientEmail(fe)) {
    if (ve && fe === ve && vu?.email_display) {
      const extracted = extractEmailFromDisplayLine(vu.email_display);
      return {
        text: vu.email_display,
        href: extracted ? `mailto:${extracted}` : null,
      };
    }
    return {
      text: 'Sans adresse e-mail personnelle — le contact et les notifications passent par le professionnel de santé qui a enregistré le rendez-vous.',
      href: null,
    };
  }
  return { text: fe, href: `mailto:${fe}` };
}

/**
 * Objet adresse pour le formulaire RDV (label + lat/lng ; complétion BAN si coords manquantes).
 */
export async function resolvePatientAddressForRdvForm(
  raw: unknown,
): Promise<{ label: string; lat: number; lng: number; complement?: string } | null> {
  const parsed = parseRawPatientAddress(raw);
  if (!parsed?.label?.trim()) return null;
  const label = parsed.label.trim();
  let lat =
    typeof parsed.lat === 'number' && Number.isFinite(parsed.lat) ? parsed.lat : NaN;
  let lng =
    typeof parsed.lng === 'number' && Number.isFinite(parsed.lng) ? parsed.lng : NaN;
  if (!Number.isFinite(lat)) lat = parseFloat(String((parsed as ParsedPatientAddress & { lat?: unknown }).lat ?? ''));
  if (!Number.isFinite(lng)) lng = parseFloat(String((parsed as ParsedPatientAddress & { lng?: unknown }).lng ?? ''));

  const coordsMissing =
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    (lat === 0 && lng === 0);

  if (coordsMissing && label.length >= 3) {
    try {
      const { apiFetch } = await import('~/utils/api');
      const res = await apiFetch(`/ban/search?q=${encodeURIComponent(label)}&limit=1`, { method: 'GET' });
      if (res?.success && Array.isArray(res.data) && res.data[0]) {
        const first = res.data[0] as { lat?: number; lng?: number };
        if (first.lat != null && first.lng != null) {
          lat = Number(first.lat);
          lng = Number(first.lng);
        }
      }
    } catch {
      /* optionnel */
    }
  }

  if (!Number.isFinite(lat)) lat = 0;
  if (!Number.isFinite(lng)) lng = 0;

  const complement = parsed.complement?.trim() ? parsed.complement.trim() : undefined;

  return { label, lat, lng, ...(complement ? { complement } : {}) };
}
