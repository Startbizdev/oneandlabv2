import { webAppUrl } from '@/config/env';
import type { ShareForNurseData } from '../api/appointment-detail.service';

/** Aligné web `NurseRdvSharePanel` : texte + URL publique + suffixe. */
export function buildNurseShareMessage(data?: ShareForNurseData | null): string {
  if (!data?.shareText?.trim() || !data.sharePath?.trim()) return '';
  const path = data.sharePath.startsWith('/') ? data.sharePath : `/${data.sharePath}`;
  return `${data.shareText}${webAppUrl(path)}${data.shareTextAfterUrl ?? ''}`;
}
