import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LocalFileRef } from '@/features/appointments/form/types';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { medicalDocumentPickErrorMessage } from '@/lib/uploads/pick-medical-document';
import { useToast } from '@/providers/ToastProvider';
import { attachPharmacyOrderPrescriptions } from '../api/pharmacy-orders.service';
import { pickPrescriptionPage, uploadPrescriptionPages } from '../api/prescription-pages';
import { invalidatePharmacyOrders } from './pharmacy-order-cache';

type PrescriptionOwner = { patientId: string; relativeId: string | null };

/** Choix d'une page puis ajout à la commande ; un seul ajout à la fois, du choix jusqu'à la réponse. */
export function useAttachPrescription(orderId: string) {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const lockedRef = useRef(false);

  const mutation = useMutation({
    mutationFn: async ({ page, owner }: { page: LocalFileRef; owner: PrescriptionOwner }) => {
      const documentIds = await uploadPrescriptionPages([page], owner);
      const res = await attachPharmacyOrderPrescriptions(orderId, documentIds);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Ajout impossible');
      return res.data;
    },
    onSuccess: async () => {
      toast('Ordonnance ajoutée', { type: 'success' });
      await invalidatePharmacyOrders(qc, orderId);
    },
    onError: (e) => handleApiError(e, toast, 'pharmacy-order-attach-prescription'),
    onSettled: () => {
      lockedRef.current = false;
    },
  });

  const add = async (owner: PrescriptionOwner) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    let page: LocalFileRef | null = null;
    try {
      page = await pickPrescriptionPage();
    } catch (e) {
      toast(medicalDocumentPickErrorMessage(e), { type: 'error' });
    }
    if (!page) {
      lockedRef.current = false;
      return;
    }
    mutation.mutate({ page, owner });
  };

  return { add, pending: mutation.isPending };
}
