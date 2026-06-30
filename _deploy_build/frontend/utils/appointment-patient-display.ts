/**
 * Nom affiché patient / proche pour RDV (liste, fiche).
 * Sources : proche (`relative`), données formulaire (`form_data`), champs racine (`first_name` / `last_name`),
 * ou `patient_name` si l’API l’expose.
 * `form_data` peut être un objet ou une chaîne JSON (sérialisation intermédiaire).
 */

function namePart(x: unknown): string {
  if (x == null) return '';
  const s = String(x).trim();
  if (!s || s === 'undefined' || s === 'null') return '';
  return s;
}

/** Retourne l’objet formulaire exploitable, ou null. */
export function normalizeAppointmentFormData(fd: unknown): Record<string, unknown> | null {
  if (fd == null) return null;
  if (typeof fd === 'string') {
    const t = fd.trim();
    if (!t || t === 'null') return null;
    try {
      const j = JSON.parse(t) as unknown;
      if (typeof j === 'object' && j !== null && !Array.isArray(j)) {
        return j as Record<string, unknown>;
      }
    } catch {
      return null;
    }
    return null;
  }
  if (typeof fd === 'object' && !Array.isArray(fd)) {
    return fd as Record<string, unknown>;
  }
  return null;
}

export function appointmentPatientDisplayName(apt: any): string {
  if (!apt) return '';
  if (typeof apt.patient_name === 'string') {
    const pn = apt.patient_name.trim();
    if (pn) return pn;
  }
  const rel = apt.relative;
  const fd = normalizeAppointmentFormData(apt.form_data);
  const relName = rel
    ? [namePart(rel.first_name), namePart(rel.last_name)].filter(Boolean).join(' ').trim()
    : '';
  const formName = fd
    ? [namePart(fd.first_name), namePart(fd.last_name)].filter(Boolean).join(' ').trim()
    : '';
  const rootName = [namePart(apt.first_name), namePart(apt.last_name)].filter(Boolean).join(' ').trim();
  return (relName || formName || rootName || '').trim();
}

/**
 * Texte normalisé pour recherche (minuscules) : toutes les variantes de prénom/nom connues sur le RDV.
 */
export function appointmentPatientSearchTextLower(apt: any): string {
  if (!apt) return '';
  const fd = normalizeAppointmentFormData(apt.form_data);
  const parts: string[] = [];
  if (apt.relative) {
    parts.push(namePart(apt.relative.first_name), namePart(apt.relative.last_name));
  }
  if (fd) {
    parts.push(namePart(fd.first_name), namePart(fd.last_name));
  }
  parts.push(namePart(apt.first_name), namePart(apt.last_name));
  if (typeof apt.patient_name === 'string' && apt.patient_name.trim()) {
    parts.push(apt.patient_name.trim());
  }
  return parts.filter(Boolean).join(' ').toLowerCase();
}
