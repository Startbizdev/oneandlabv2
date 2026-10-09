import {
  carePhotoPickErrorMessage,
  pickCarePhoto,
  type CarePhotoPickResult,
} from './pick-care-photo';

export type PickedMedicalDocument = CarePhotoPickResult;

/** Image ou PDF via la feuille d'actions : appareil photo, galerie ou fichier (max 25 Mo). */
export async function pickMedicalDocumentFile(
  title = 'Ajouter un fichier',
): Promise<PickedMedicalDocument | null> {
  return pickCarePhoto(title);
}

export const medicalDocumentPickErrorMessage = carePhotoPickErrorMessage;
