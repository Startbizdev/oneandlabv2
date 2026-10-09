import { medicalDocumentReplacePath } from '@oneandlab/shared-utils';
import { apiFetch } from '~/utils/api';
import {
  MEDICAL_DOCUMENT_ACCEPT,
  isAllowedMedicalDocumentFile,
  isMedicalDocumentTooLarge,
  medicalDocumentFormatError,
} from '~/utils/medical-document-upload';

type ApiEnvelope = { success: boolean; error?: string };

function pickFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = MEDICAL_DOCUMENT_ACCEPT;
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true });
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.click();
  });
}

/** `POST /medical-documents/{id}/replace` : nouvelle version d'une ordonnance, l'ancienne est archivée. */
export function useReplacePrescription() {
  const toast = useAppToast();
  const replacingId = ref<string | null>(null);

  async function replace(documentId: string): Promise<boolean> {
    const file = await pickFile();
    if (!file) return false;
    if (!isAllowedMedicalDocumentFile(file)) {
      toast.add({ title: medicalDocumentFormatError(), color: 'error' });
      return false;
    }
    if (isMedicalDocumentTooLarge(file)) {
      toast.add({ title: 'Fichier trop volumineux', description: 'Le fichier dépasse 25 Mo.', color: 'error' });
      return false;
    }
    if (!window.confirm('Remplacer l’ordonnance ?\nL’ancienne version sera archivée.')) return false;

    replacingId.value = documentId;
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await apiFetch<ApiEnvelope>(medicalDocumentReplacePath(documentId), { method: 'POST', body });
      if (!res?.success) throw new Error(res?.error ?? 'Remplacement impossible');
      toast.add({ title: 'Ordonnance remplacée', color: 'success' });
      return true;
    } catch (e: unknown) {
      toast.add({ title: e instanceof Error && e.message ? e.message : 'Remplacement impossible', color: 'error' });
      return false;
    } finally {
      replacingId.value = null;
    }
  }

  return { replacingId, replace };
}
