import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { getDocumentTypeLabel } from '@/features/appointments/detail/utils/document-labels';

dayjs.locale('fr');

/** Libellé secondaire sous le type de document (date de dépôt, sans nom de fichier). */
export function formatDocumentFileSubtitle(
  _documentType: string,
  _fileName?: string | null,
  createdAt?: string | null,
): string {
  if (createdAt) {
    const d = dayjs(createdAt);
    if (d.isValid()) return d.format('D MMM YYYY');
  }
  return 'Fichier déposé';
}

export function formatDocumentRowTitle(documentType: string): string {
  return getDocumentTypeLabel(documentType);
}
