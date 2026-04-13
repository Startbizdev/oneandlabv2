import { patientUiEmailLine } from './patient-address-rdv';

/** Placeholder du champ de recherche dans USelectMenu (évite la chaîne i18n anglaise par défaut). */
export const PATIENT_SELECT_SEARCH_PLACEHOLDER =
  'Rechercher par nom, email, téléphone, date de naissance…';

export type PatientSelectLabelStyle = 'natural' | 'professional';

/** Affiche une date de naissance type AAAA-MM-JJ en jj/mm/aaaa (FR). */
export function formatBirthDateFrShort(raw: string | null | undefined): string {
  if (!raw) return '';
  const s = String(raw).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  return s;
}

type PatientLike = {
  id?: string | number | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  email_display?: string | null;
  phone?: string | null;
  birth_date?: string | null;
};

export type PatientSelectMenuItem = {
  label: string;
  value: string;
  /** Ligne secondaire : email, téléphone, naissance (pour la liste déroulante). */
  metaLine: string;
  /** Tous les champs concaténés pour le filtre de recherche. */
  searchText: string;
};

/**
 * Ligne patient pour USelectMenu : libellé principal + méta + texte de recherche étendu.
 */
export function buildPatientSelectRow(
  p: PatientLike,
  options?: { labelStyle?: PatientSelectLabelStyle }
): PatientSelectMenuItem {
  const style = options?.labelStyle ?? 'natural';
  const first = String(p.first_name ?? '').trim();
  const last = String(p.last_name ?? '').trim();
  const email = patientUiEmailLine({ email: p.email, email_display: p.email_display });
  const phone = String(p.phone ?? '').trim();
  const birthRaw = p.birth_date;
  const birthFr = formatBirthDateFrShort(birthRaw ?? undefined);

  let label: string;
  if (style === 'professional') {
    const upperLast = last ? last.toUpperCase() : '';
    label = [upperLast, first].filter(Boolean).join(' ').trim() || email || String(p.id ?? '');
  } else {
    const fullNatural = [first, last].filter(Boolean).join(' ');
    label = fullNatural || email || String(p.id ?? '');
  }

  const metaParts: string[] = [];
  if (email) metaParts.push(email);
  if (phone) metaParts.push(phone);
  if (birthFr) metaParts.push(`Né(e) le ${birthFr}`);

  const metaLine = metaParts.join(' · ');

  const phoneDigits = phone.replace(/\D/g, '');

  const searchText = [
    label,
    first,
    last,
    last.toUpperCase(),
    [first, last].filter(Boolean).join(' '),
    [last, first].filter(Boolean).join(' '),
    email,
    String(p.email ?? '').trim(),
    String(p.email_display ?? '').trim(),
    phone,
    phoneDigits,
    birthFr,
    birthRaw,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    label,
    value: String(p.id ?? ''),
    metaLine,
    searchText,
  };
}
