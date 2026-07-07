import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { Download, X } from 'lucide-react-native';
import { Cluster } from '@/components/layout/primitives';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { FullscreenImageViewer } from '@/components/ui/FullscreenImageViewer';
import { exportLocalFile } from '@/lib/downloads/open-local-file';
import { resolveDocumentPreviewKind } from '@/lib/downloads/document-file-kind';
import { inspectMedDocFile, logMedDoc } from '@/lib/uploads/medical-doc-file-debug';
import { useToast } from '@/providers/ToastProvider';
import { iconSize, spacing, AppText } from '@/theme';
import { layoutRow } from '@/theme/layout-styles';
import { fontFamily, fontSize } from '@/theme/typography';

const VIEWER_ACTION_SIZE = 44;

function pdfPreviewTitle(fileName?: string): string {
  const name = fileName?.trim();
  if (!name) return 'Ordonnance';
  if (/^ordonnance/i.test(name)) return 'Ordonnance';
  return name.length > 28 ? `${name.slice(0, 25)}…` : name;
}

interface Props {
  visible: boolean;
  localUri: string | null;
  fileName?: string;
  onClose: () => void;
}

function PdfPreviewBody({ localUri, fileName }: { localUri: string; fileName?: string }) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'MedicalDocumentPreviewModal.PdfPreviewBody');
  const [html, setHtml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHtml(null);
    setFailed(false);

    void (async () => {
      try {
        const base64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (cancelled) return;
        const title = (fileName ?? 'Document').replace(/[<>&"]/g, '');
        setHtml(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4" />
  <title>${title}</title>
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #1a1a1a; }
    embed { width: 100%; height: 100%; border: 0; }
  </style>
</head>
<body>
  <embed src="data:application/pdf;base64,${base64}" type="application/pdf" />
</body>
</html>`);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [localUri, fileName]);

  if (failed) {
    return (
      <View style={styles.center}>
        <AppText style={styles.failText}>Impossible d’afficher ce PDF.</AppText>
      </View>
    );
  }

  if (!html) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={c.primary} />
        <AppText style={styles.loadingText}>Chargement du PDF…</AppText>
      </View>
    );
  }

  return (
    <WebView
      source={{ html }}
      style={styles.webview}
      originWhitelist={['*']}
      allowFileAccess
      allowUniversalAccessFromFileURLs={Platform.OS === 'android'}
      startInLoadingState
      renderLoading={() => (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      )}
    />
  );
}

/** Visionneuse in-app : image plein écran ou PDF intégré. */
export function MedicalDocumentPreviewModal({ visible, localUri, fileName, onClose }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_documents_components_MedicalDocumentPreviewModal_tsx_MedicalDocumentPreviewModal_styles');

  const insets = useSafeAreaInsets();
  const { show: toast } = useToast();
  const [exportBusy, setExportBusy] = useState(false);
  const kind = resolveDocumentPreviewKind(fileName);

  useEffect(() => {
    if (!visible || !localUri) return;
    logMedDoc('preview:OPEN', { localUri, fileName, kind });
    void inspectMedDocFile(localUri, 'preview:modal');
  }, [visible, localUri, fileName, kind]);

  const handleExport = useCallback(async () => {
    if (!localUri || exportBusy) return;
    setExportBusy(true);
    const res = await exportLocalFile(localUri, fileName);
    setExportBusy(false);
    if (!res.ok) {
      toast(res.error ?? 'Enregistrement impossible', { type: 'error' });
    }
  }, [exportBusy, fileName, localUri, toast]);

  if (!visible || !localUri) return null;

  if (kind === 'image') {
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={[styles.pdfShell, { paddingTop: insets.top }]}>
        <Cluster
          gap={spacing[3]}
          style={styles.pdfHeader}
          actions={
            <View style={styles.headerActions}>
              <IconActionButton
                label="Télécharger le document"
                onPress={() => void handleExport()}
                loading={exportBusy}
                disabled={exportBusy}
                variant="secondary"
                backgroundColor={c.primaryLight}
                style={styles.headerActionBtn}
              >
                <Download size={iconSize.sm} color={c.primary} strokeWidth={2.25} />
              </IconActionButton>
              <IconActionButton
                label="Fermer l’aperçu"
                onPress={onClose}
                variant="muted"
                backgroundColor={c.surfaceAlt}
                style={styles.headerActionBtn}
              >
                <X size={iconSize.sm} color={c.textSecondary} strokeWidth={2.5} />
              </IconActionButton>
            </View>
          }
        >
          <AppText style={styles.pdfTitle} numberOfLines={1}>
            {pdfPreviewTitle(fileName)}
          </AppText>
        </Cluster>
        <PdfPreviewBody localUri={localUri} fileName={fileName} />
      </View>
    </Modal>
  );
}

function buildStyles(c: AppColors) {
  return {
  pdfShell: {
    minWidth: 0,
    flex: 1,
    backgroundColor: c.background,
  },
  pdfHeader: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
    backgroundColor: c.background,
    zIndex: 10,
    ...(Platform.OS === 'android' ? { elevation: 4 } : null),
  },
  headerActions: {
    ...layoutRow(spacing[2]),
    flexShrink: 0,
    alignItems: 'center' as const,
  },
  headerActionBtn: {
    width: VIEWER_ACTION_SIZE,
    height: VIEWER_ACTION_SIZE,
    minWidth: VIEWER_ACTION_SIZE,
    minHeight: VIEWER_ACTION_SIZE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderLight,
  },
  pdfTitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  webview: {
    minWidth: 0,
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  center: {
    minWidth: 0,
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing[3],
    backgroundColor: c.background,
  },
  loadingText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  failText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    textAlign: 'center' as const,
    paddingHorizontal: spacing[6],
  },
};
}
