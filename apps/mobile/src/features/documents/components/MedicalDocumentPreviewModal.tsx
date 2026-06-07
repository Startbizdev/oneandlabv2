import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { Download, X } from 'lucide-react-native';
import { FullscreenImageViewer } from '@/components/ui/FullscreenImageViewer';
import { exportLocalFile } from '@/lib/downloads/open-local-file';
import { resolveDocumentPreviewKind } from '@/lib/downloads/document-file-kind';
import { inspectMedDocFile, logMedDoc } from '@/lib/uploads/medical-doc-file-debug';
import { useToast } from '@/providers/ToastProvider';
import { colors, iconSize, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  visible: boolean;
  localUri: string | null;
  fileName?: string;
  onClose: () => void;
}

function PreviewHeaderButton({
  label,
  onPress,
  busy,
  children,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.headerBtn, pressed && !busy && styles.headerBtnPressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
    >
      {busy ? <ActivityIndicator size="small" color={colors.textPrimary} /> : children}
    </Pressable>
  );
}

function PdfPreviewBody({ localUri, fileName }: { localUri: string; fileName?: string }) {
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
        <Text style={styles.failText}>Impossible d’afficher ce PDF.</Text>
      </View>
    );
  }

  if (!html) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement du PDF…</Text>
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
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    />
  );
}

/** Visionneuse in-app : image plein écran ou PDF intégré. */
export function MedicalDocumentPreviewModal({ visible, localUri, fileName, onClose }: Props) {
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
        <View style={styles.pdfHeader}>
          <Text style={styles.pdfTitle} numberOfLines={1}>
            {fileName?.trim() || 'Document PDF'}
          </Text>
          <PreviewHeaderButton
            label="Enregistrer le PDF"
            onPress={() => void handleExport()}
            busy={exportBusy}
          >
            <Download size={iconSize.md} color={colors.textPrimary} strokeWidth={2.25} />
          </PreviewHeaderButton>
          <PreviewHeaderButton label="Fermer l’aperçu" onPress={onClose}>
            <X size={iconSize.md} color={colors.textPrimary} strokeWidth={2.5} />
          </PreviewHeaderButton>
        </View>
        <PdfPreviewBody localUri={localUri} fileName={fileName} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pdfShell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  pdfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pdfTitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  headerBtn: {
    width: spacing[12],
    height: spacing[12],
    borderRadius: spacing[12] / 2,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnPressed: {
    opacity: 0.85,
  },
  webview: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    backgroundColor: colors.background,
  },
  loadingText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  failText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing[6],
  },
});
