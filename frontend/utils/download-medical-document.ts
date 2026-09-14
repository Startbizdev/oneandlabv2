import { useRuntimeConfig } from '#app';

/** Télécharge un document médical avec authentification Bearer. */
export async function downloadMedicalDocument(docId: string, fileName?: string): Promise<void> {
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
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'document';
  a.click();
  URL.revokeObjectURL(url);
}
