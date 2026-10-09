import { useCallback, useEffect, useRef, useState } from 'react';
import { FullscreenImageViewer } from '@/components/ui/FullscreenImageViewer';
import { exportLocalFile, openLocalFile } from '@/lib/downloads/open-local-file';
import { resolveDocumentPreviewKind } from '@/lib/downloads/document-file-kind';
import { inspectMedDocFile, logMedDoc } from '@/lib/uploads/medical-doc-file-debug';
import { useToast } from '@/providers/ToastProvider';

interface Props {
  visible: boolean;
  localUri: string | null;
  fileName?: string;
  onClose: () => void;
}

/**
 * Aperçu d'un document : image en plein écran dans l'app, PDF dans le lecteur du système
 * (application PDF sur Android, feuille de partage avec aperçu sur iOS) ; `onClose` est appelé à son retour.
 */
export function MedicalDocumentPreviewModal({ visible, localUri, fileName, onClose }: Props) {
  const { show: toast } = useToast();
  const [exportBusy, setExportBusy] = useState(false);
  const kind = resolveDocumentPreviewKind(fileName);
  const openedPdfRef = useRef<string | null>(null);

  useEffect(() => {
    if (!visible || !localUri) return;
    logMedDoc('preview:OPEN', { localUri, fileName, kind });
    void inspectMedDocFile(localUri, 'preview:modal');
  }, [visible, localUri, fileName, kind]);

  useEffect(() => {
    if (!visible || !localUri || kind !== 'pdf') {
      openedPdfRef.current = null;
      return;
    }
    if (openedPdfRef.current === localUri) return;
    openedPdfRef.current = localUri;
    void openLocalFile(localUri, fileName).then((res) => {
      if (!res.ok) toast(res.error ?? 'Ouverture du PDF impossible', { type: 'error' });
      onClose();
    });
  }, [visible, localUri, fileName, kind, toast, onClose]);

  const handleExport = useCallback(async () => {
    if (!localUri || exportBusy) return;
    setExportBusy(true);
    const res = await exportLocalFile(localUri, fileName);
    setExportBusy(false);
    if (!res.ok) {
      toast(res.error ?? 'Enregistrement impossible', { type: 'error' });
    }
  }, [exportBusy, fileName, localUri, toast]);

  if (!visible || !localUri || kind !== 'image') return null;

  return (
    <FullscreenImageViewer
      visible={visible}
      uri={localUri}
      onClose={onClose}
      onExport={() => void handleExport()}
      exportBusy={exportBusy}
    />
  );
}
