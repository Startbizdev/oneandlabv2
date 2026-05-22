import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { getDocumentTypeLabel } from '@/features/appointments/detail/utils/document-labels';

dayjs.locale('fr');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const GENERIC_FILE_RE = /^(image|img|photo|document|file|scan|capture)/i;

function isGenericFileName(name: string): boolean {
  const base = name.replace(/\.[a-z0-9]+$/i, '').trim();
  if (!base || base.length < 3) return true;
  if (UUID_RE.test(base)) return true;
  if (GENERIC_FILE_RE.test(base)) return true;
  if (/^[0-9a-f-]{20,}$/i.test(base)) return true;
  return false;
}

/** Libellé secondaire sous le type de document (pas le nom brut API). */
export function formatDocumentFileSubtitle(
  documentType: string,
  fileName?: string | null,
  createdAt?: string | null,
): string {
  const parts: string[] = [];
  if (createdAt) {
    const d = dayjs(createdAt);
    if (d.isValid()) parts.push(d.format('D MMM YYYY'));
  }
  const raw = (fileName ?? '').trim();
  if (raw && !isGenericFileName(raw)) {
    const short = raw.length > 28 ? `${raw.slice(0, 25)}…` : raw;
    parts.push(short);
  } else if (!parts.length) {
    parts.push('Fichier déposé');
  }
  return parts.join(' · ');
}

export function formatDocumentRowTitle(documentType: string): string {
  return getDocumentTypeLabel(documentType);
}
