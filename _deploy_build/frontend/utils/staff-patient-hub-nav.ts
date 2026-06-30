import type { StaffHubSearchItem } from '@oneandlab/shared-types';

export function staffHubItemHref(item: StaffHubSearchItem, basePath: string): string {
  if (item.kind === 'patient') {
    return `/profile?userId=${encodeURIComponent(item.patient_id)}`;
  }
  if (item.kind === 'document') {
    return `/profile?userId=${encodeURIComponent(item.patient_id)}`;
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
