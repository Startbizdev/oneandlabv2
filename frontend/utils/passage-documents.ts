import type { AppointmentDocumentTypeOnly } from '@oneandlab/shared-utils';

export type PassageDocument = AppointmentDocumentTypeOnly & { id: string; file_name?: string };

type PassageRouteQuery = { appointmentId: string; stopId?: string };

function passageQueryString({ appointmentId, stopId }: PassageRouteQuery): string {
  const params = new URLSearchParams();
  if (appointmentId) params.set('appointment_id', appointmentId);
  if (stopId) params.set('stop_id', stopId);
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** Fiche passage : série, ou RDV seul (`rdv`). */
export function passageDetailPath(seriesParam: string, query: PassageRouteQuery): string {
  return `/nurse/passage/${encodeURIComponent(seriesParam || 'rdv')}${passageQueryString(query)}`;
}

/** Vue « Documents » du passage : documents du RDV et ordonnances. */
export function passageDocumentsPath(seriesParam: string, query: PassageRouteQuery): string {
  return `/nurse/passage/${encodeURIComponent(seriesParam || 'rdv')}/documents${passageQueryString(query)}`;
}

/** Documents listés et comptés : les photos de soin ont leur propre fil. */
export function passageListDocuments<T extends AppointmentDocumentTypeOnly>(docs: readonly T[]): T[] {
  return docs.filter((d) => d.document_type !== 'care_photo');
}
