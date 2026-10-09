import type { StaffHubSearchItem } from '@oneandlab/shared-types';

function profileHref(userId: string, relativeId?: string): string {
  const q = new URLSearchParams({ userId });
  if (relativeId) q.set('relativeId', relativeId);
  return `/profile?${q.toString()}`;
}

export function staffHubItemHref(item: StaffHubSearchItem, basePath: string): string {
  if (item.kind === 'relative') {
    const profileId = item.profile_id?.trim();
    return profileId ? profileHref(profileId) : profileHref(item.patient_id, item.relative_id);
  }
  if (item.kind === 'patient' || item.kind === 'document') {
    return profileHref(item.patient_id);
  }
  const hash = `rdv-care-photo-${encodeURIComponent(item.medical_document_id)}`;
  return `${basePath}/appointments/${encodeURIComponent(item.appointment_id)}#${hash}`;
}

export function staffHubListHeader(searchQuery: string, count: number): string {
  if (searchQuery.trim()) {
    return `${count} résultat${count > 1 ? 's' : ''}`;
  }
  return `${count} patient${count > 1 ? 's' : ''}`;
}
