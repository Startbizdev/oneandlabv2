const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isFrenchPhoneLookupFormat(phone: string): boolean {
  const cleaned = phone.replace(/[\s.\-]/g, '');
  return /^(\+33|0)[1-9]\d{8}$/.test(cleaned);
}

type LookupApiFetch = (
  url: string,
  opts?: { method?: string },
) => Promise<{ success?: boolean; data?: Record<string, unknown> | null }>;

/** Email d’abord, puis téléphone si aucun dossier trouvé par email. */
export async function lookupPatientByContact(
  apiFetch: LookupApiFetch,
  email: string,
  phone: string,
): Promise<Record<string, unknown> | null> {
  const em = email.trim();
  const ph = phone.trim();
  const emailOk = EMAIL_RE.test(em);
  const phoneOk = isFrenchPhoneLookupFormat(ph);
  if (!emailOk && !phoneOk) return null;

  if (emailOk) {
    const res = await apiFetch(`/patients/lookup?email=${encodeURIComponent(em)}`, { method: 'GET' });
    if (res?.success && res.data && typeof res.data === 'object' && res.data.id != null) {
      return res.data;
    }
  }
  if (phoneOk) {
    const res = await apiFetch(`/patients/lookup?phone=${encodeURIComponent(ph)}`, { method: 'GET' });
    if (res?.success && res.data && typeof res.data === 'object' && res.data.id != null) {
      return res.data;
    }
  }
  return null;
}
