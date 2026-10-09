import { useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { replaceMedicalDocument } from '@/features/appointments/api/medical-documents.service';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { queryKeys } from '@/lib/query-keys';
import {
  medicalDocumentPickErrorMessage,
  pickMedicalDocumentFile,
  type PickedMedicalDocument,
} from '@/lib/uploads/pick-medical-document';
import { useToast } from '@/providers/ToastProvider';

/** « Remplacer » une ordonnance : fichier, confirmation, puis listes rafraîchies (RDV, prescriptions, commandes). */
export function useReplacePrescription() {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const [replacingId, setReplacingId] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: ({ documentId, file }: { documentId: string; file: PickedMedicalDocument }) =>
      replaceMedicalDocument(documentId, file),
    onSuccess: (_doc, { documentId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.documents.all });
      void qc.invalidateQueries({ queryKey: queryKeys.prescriptions.all });
      void qc.invalidateQueries({ queryKey: queryKeys.pharmacyOrders.details });
      void qc.invalidateQueries({ queryKey: queryKeys.documents.byId(documentId) });
      toast('Ordonnance remplacée', { type: 'success' });
    },
    onError: (e) => handleApiError(e, toast, 'prescription-replace', 'Remplacement impossible'),
    onSettled: () => setReplacingId(null),
  });

  const replace = async (documentId: string) => {
    if (replacingId) return;
    let file: PickedMedicalDocument | null;
    try {
      file = await pickMedicalDocumentFile('Remplacer l’ordonnance');
    } catch (e) {
      toast(medicalDocumentPickErrorMessage(e), { type: 'error' });
      return;
    }
    if (!file) return;
    const picked = file;
    Alert.alert('Remplacer l’ordonnance ?', 'L’ancienne version sera archivée.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Remplacer',
        onPress: () => {
          setReplacingId(documentId);
          mut.mutate({ documentId, file: picked });
        },
      },
    ]);
  };

  return { replace, replacingId };
}
