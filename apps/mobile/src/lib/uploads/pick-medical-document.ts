import {
  carePhotoPickErrorMessage,
  pickCarePhoto,
  type CarePhotoPickResult,
} from './pick-care-photo';

export type PickedMedicalDocument = CarePhotoPickResult;

/** Image ou PDF via menu natif : appareil photo, galerie ou fichier (max 25 Mo). */
export async function pickMedicalDocumentFile(): Promise<PickedMedicalDocument | null> {
  return pickCarePhoto();
}

export const medicalDocumentPickErrorMessage = carePhotoPickErrorMessage;
