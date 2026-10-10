import { useRuntimeConfig } from '#app';

async function fetchMedicalDocumentBlob(docId: string): Promise<Blob> {
  const config = useRuntimeConfig();
  const apiBase = config.public?.apiBase || '/api';
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const res = await fetch(`${apiBase}/medical-documents/${encodeURIComponent(docId)}/download`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error('Téléchargement impossible');
  }
  return res.blob();
}

/** Télécharge un document médical avec authentification Bearer. */
export async function downloadMedicalDocument(docId: string, fileName?: string): Promise<void> {
  const blob = await fetchMedicalDocumentBlob(docId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'document';
  a.click();
  URL.revokeObjectURL(url);
}

/** Ouvre le fichier en mémoire pour un aperçu, sans déclencher l'enregistrement. */
export async function previewMedicalDocumentUrl(docId: string): Promise<string> {
  const blob = await fetchMedicalDocumentBlob(docId);
  return URL.createObjectURL(blob);
}
