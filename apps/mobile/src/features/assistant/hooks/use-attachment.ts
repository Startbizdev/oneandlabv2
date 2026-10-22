import type { MobileRole } from '@oneandlab/shared-constants';
import { useCallback, useRef, useState } from 'react';
import { useToast } from '@/providers/ToastProvider';
import { useAuthStore } from '@/store/auth-store';
import { carePhotoPickErrorMessage, pickCarePhoto } from '@/lib/uploads/pick-care-photo';
import { uploadMedicalDocument } from '@/lib/uploads/upload-file';
import type { ComposerAttachment } from '../components/AssistantComposer';
import { attachmentUploadMeta } from '../utils/attachment-target';

/** Photo ou PDF déposé dans le dossier médical, puis joint (`document_id`) au message suivant. */
export function useAttachment(role: MobileRole, scope: { appointmentId?: string; patientId?: string }) {
  const { show: toast } = useToast();
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const [attachment, setAttachment] = useState<(ComposerAttachment & { documentId?: string }) | null>(null);
  /** Une pièce retirée pendant l'envoi ne doit pas réapparaître. */
  const tokenRef = useRef(0);

  const attach = useCallback(async () => {
    const token = ++tokenRef.current;
    try {
      const picked = await pickCarePhoto('Joindre un document');
      if (!picked || token !== tokenRef.current) return;
      const meta = attachmentUploadMeta(role, { userId, ...scope }, picked.fileName);
      if (typeof meta === 'string') {
        toast(meta, { type: 'info' });
        return;
      }
      setAttachment({ fileName: picked.fileName, uploading: true });
      const uploaded = await uploadMedicalDocument(picked, meta);
      if (!uploaded?.id) throw new Error('UPLOAD_FAILED');
      if (token === tokenRef.current) {
        setAttachment({ fileName: uploaded.file_name ?? picked.fileName, uploading: false, documentId: uploaded.id });
      }
    } catch (err) {
      console.warn('[assistant] pièce jointe impossible', err);
      if (token === tokenRef.current) setAttachment(null);
      toast(carePhotoPickErrorMessage(err), { type: 'error' });
    }
  }, [role, scope, toast, userId]);

  const clear = useCallback(() => {
    tokenRef.current += 1;
    setAttachment(null);
  }, []);

  return { attachment, attach, clear };
}
