import type { Ref } from 'vue';
import { apiFetch } from '~/utils/api';
import type { PassageDocument } from '~/utils/passage-documents';

/** Documents du RDV d'un passage : compteur de la fiche et vue « Documents ». */
export function usePassageDocumentsWeb(appointmentId: Ref<string>) {
  const documents = ref<PassageDocument[]>([]);
  const loading = ref(false);
  const error = ref('');

  async function load() {
    if (!appointmentId.value) return;
    loading.value = true;
    error.value = '';
    try {
      const res = await apiFetch<{ success: boolean; data?: PassageDocument[]; error?: string }>(
        `/medical-documents?appointment_id=${encodeURIComponent(appointmentId.value)}`,
      );
      if (!res?.success || !Array.isArray(res.data)) throw new Error(res?.error || 'Impossible de charger les documents.');
      documents.value = res.data;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Réessayez dans un instant.';
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    documents.value = [];
    error.value = '';
  }

  return { documents, loading, error, load, reset };
}
