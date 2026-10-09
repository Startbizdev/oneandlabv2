import type { Appointment } from '@oneandlab/shared-types';
import type { MedicalDocumentRow } from '../api/appointment-detail.service';
import { getAppointmentDetailRoleConfig } from './appointment-detail-role-config';
import { isCarePhotoExchangeRole } from './care-photo-navigation';
import { isCarePhotoGalleryContext } from './care-photo-rules';
import { filterListDocuments } from './document-labels';

/** Suivi des soins pro ↔ infirmier : ses photos ont leur propre vue, hors de la liste des documents. */
export function appointmentHasCareGallery(role: string, apt: Appointment | undefined): boolean {
  return Boolean(
    apt &&
      getAppointmentDetailRoleConfig(role).showCarePhotosBlock &&
      isCarePhotoExchangeRole(role) &&
      isCarePhotoGalleryContext(apt),
  );
}

/** Le patient ne voit jamais les photos de soin dans ses documents. */
export function appointmentDocumentsOmitCarePhotos(role: string, apt: Appointment | undefined): boolean {
  return role === 'patient' || appointmentHasCareGallery(role, apt);
}

/** Documents listés sur la vue « Documents » d'un RDV (et comptés sur la fiche). */
export function appointmentListDocuments(
  docs: MedicalDocumentRow[],
  role: string,
  omitCarePhotos: boolean,
): MedicalDocumentRow[] {
  return filterListDocuments(
    role === 'patient' ? docs.filter((d) => d.document_type !== 'cancellation_photo') : docs,
    { omitCarePhotos },
  );
}
