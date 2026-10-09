import type { MobileRole } from '@oneandlab/shared-constants';
import type { AiMessageSource } from '@oneandlab/shared-types';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  cacheMedicalDocument,
  getCachedMedicalDocumentUri,
  openMedicalDocument,
} from '@/lib/downloads/download-medical-document';
import { appointmentDetailHref } from '@/navigation/role-hrefs';
import { roleRoutePrefix } from '@/navigation/role-route-prefix';
import { useToast } from '@/providers/ToastProvider';
import { sourceKey } from '../components/CaryAiSourcePills';
import type { PatientAiChatAttachment } from '../types/patient-ai-conversation';

export type CaryAiFilePreview = { uri: string; fileName?: string };

const DOCUMENT_UNAVAILABLE = 'Document indisponible pour le moment.';

/** Ouverture des sources citées par Cary (RDV, documents) et aperçu des pièces jointes du fil. */
export function useCaryAiResourceOpener(role: MobileRole) {
  const router = useRouter();
  const { show: showToast } = useToast();
  const [preview, setPreview] = useState<CaryAiFilePreview | null>(null);
  const [openingSourceKey, setOpeningSourceKey] = useState<string | null>(null);
  const openingRef = useRef(false);

  const openSource = useCallback(
    async (source: AiMessageSource) => {
      if (source.type === 'appointment') {
        router.push(appointmentDetailHref(roleRoutePrefix(role), source.id));
        return;
      }
      if (openingRef.current) return;
      openingRef.current = true;
      setOpeningSourceKey(sourceKey(source));
      try {
        const result = await openMedicalDocument(source.id);
        if (!result.ok) showToast(result.error ?? DOCUMENT_UNAVAILABLE, { type: 'error' });
      } catch (e) {
        console.warn('[cary-ai] ouverture de la source impossible', source.type, e);
        showToast(DOCUMENT_UNAVAILABLE, { type: 'error' });
      } finally {
        openingRef.current = false;
        setOpeningSourceKey(null);
      }
    },
    [role, router, showToast],
  );

  const previewAttachment = useCallback(
    async (attachment: PatientAiChatAttachment) => {
      try {
        let uri: string | null | undefined = attachment.uri;
        if (attachment.medicalDocumentId) {
          uri =
            (await getCachedMedicalDocumentUri(attachment.medicalDocumentId, attachment.fileName)) ??
            (await cacheMedicalDocument(attachment.medicalDocumentId, attachment.fileName)).localUri ??
            uri;
        }
        if (uri) setPreview({ uri, fileName: attachment.fileName });
        else showToast(DOCUMENT_UNAVAILABLE, { type: 'error' });
      } catch (e) {
        console.warn('[cary-ai] aperçu de la pièce jointe impossible', e);
        showToast(DOCUMENT_UNAVAILABLE, { type: 'error' });
      }
    },
    [showToast],
  );

  return { preview, setPreview, openingSourceKey, openSource, previewAttachment };
}
