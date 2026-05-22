/**
 * Affichage e-mail patient (aligné web `patient-address-rdv.ts`).
 * Ne jamais montrer `delegated-…@patients.internal.local` tel quel.
 */

export function isTechnicalPatientEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const e = email.trim().toLowerCase();
  return e.endsWith('@patients.internal.local') || e.startsWith('delegated-');
}

export function extractEmailFromDisplayLine(s: string): string | null {
  const emails = s.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  return emails?.length ? emails[emails.length - 1]! : null;
}

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

export function resolvePatientContactEmail(opts: {
  rawEmail: unknown;
  emailDisplay?: string | null;
  viewerEmail?: string | null;
  viewerEmailDisplay?: string | null;
}): { text: string; href: string | null } {
  const raw = typeof opts.rawEmail === 'string' ? opts.rawEmail.trim() : '';
  if (!raw) return { text: '', href: null };

  const display = opts.emailDisplay ?? null;
  const text = patientUiEmailLine({ email: raw, email_display: display });

  if (isTechnicalPatientEmail(raw)) {
    if (display) {
      const extracted = extractEmailFromDisplayLine(display);
      return { text, href: extracted ? `mailto:${extracted}` : null };
    }
    const ve = typeof opts.viewerEmail === 'string' ? opts.viewerEmail.trim() : '';
    if (ve && raw === ve && opts.viewerEmailDisplay) {
      const extracted = extractEmailFromDisplayLine(opts.viewerEmailDisplay);
      return {
        text: opts.viewerEmailDisplay,
        href: extracted ? `mailto:${extracted}` : null,
      };
    }
    return { text, href: null };
  }

  return { text: raw, href: `mailto:${raw}` };
}
