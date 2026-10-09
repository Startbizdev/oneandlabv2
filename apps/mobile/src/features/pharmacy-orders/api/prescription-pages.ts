import type { LocalFileRef } from '@/features/appointments/form/types';
import type { DocumentFileRef } from '@/features/appointments/form/types/document-file-ref';
import { isLocalFileRef, isProfileDocRef } from '@/features/appointments/form/types/document-file-ref';
import { pickMedicalDocumentFile } from '@/lib/uploads/pick-medical-document';
import { uploadMedicalDocument } from '@/lib/uploads/upload-file';

/** Photo, image de la galerie ou PDF ; `null` si l'utilisateur renonce. Les erreurs (permission, taille, format) remontent. */
export async function pickPrescriptionPage(): Promise<LocalFileRef | null> {
  const picked = await pickMedicalDocumentFile();
  return picked ? { uri: picked.uri, name: picked.fileName, mimeType: picked.mimeType } : null;
}

/** Envoie les pages locales comme ordonnances du bénéficiaire et renvoie les identifiants de documents, dans l'ordre. */
export async function uploadPrescriptionPages(
  pages: DocumentFileRef[],
  owner: { patientId: string; relativeId: string | null },
): Promise<string[]> {
  const ids: string[] = [];
  for (const page of pages) {
    if (isLocalFileRef(page)) {
      const uploaded = await uploadMedicalDocument(
        { uri: page.uri, fileName: page.name, mimeType: page.mimeType },
        {
          patient_id: owner.patientId,
          relative_id: owner.relativeId ?? undefined,
          document_type: 'ordonnance',
        },
      );
      if (!uploaded?.id) throw new Error('Upload ordonnance échoué');
      ids.push(uploaded.id);
    } else if (isProfileDocRef(page)) {
      ids.push(page.medical_document_id);
    }
  }
  return ids;
}
