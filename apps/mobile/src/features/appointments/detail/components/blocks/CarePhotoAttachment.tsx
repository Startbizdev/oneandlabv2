import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Download, FileText, ImageOff, Maximize2, RefreshCw } from 'lucide-react-native';
import type { CarePhotoRow } from '../../api/appointment-detail.service';
import { carePhotoAttachmentLabel, isCarePhotoPdf } from '../../utils/care-photo-file';
import { loadCarePhotoLocalUri } from '../../utils/care-photo-image';
import { Row } from '@/components/layout/primitives';
import { CarePhotoImage } from './CarePhotoImage';
import { exportLocalFile } from '@/lib/downloads/open-local-file';
import { MedicalDocumentPreviewModal } from '@/features/documents/components/MedicalDocumentPreviewModal';
import { useToast } from '@/providers/ToastProvider';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  photo: CarePhotoRow;
  style?: StyleProp<ViewStyle>;
  onZoom?: () => void;
  accessibilityLabel?: string;
  children?: React.ReactNode;
}

export function CarePhotoAttachment({
  photo,
  style,
  onZoom,
  accessibilityLabel,
  children,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_blocks_CarePhotoAttachment_tsx_styles');
  const { show: toast } = useToast();
  const isPdf = isCarePhotoPdf(photo);

  if (!isPdf) {
    return (
      <CarePhotoImage
        photoId={photo.id}
        style={style}
        onPress={onZoom}
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </CarePhotoImage>
    );
  }

  return (
    <CarePhotoPdfCard
      photo={photo}
      style={style}
      label={carePhotoAttachmentLabel(photo)}
      onZoom={onZoom}
      toast={toast}
      children={children}
    />
  );
}

function CarePhotoPdfCard({
  photo,
  style,
  label,
  onZoom,
  toast,
  children,
}: {
  photo: CarePhotoRow;
  style?: StyleProp<ViewStyle>;
  label: string;
  onZoom?: () => void;
  toast: (msg: string, opts?: { type?: 'success' | 'warning' | 'error' }) => void;
  children?: React.ReactNode;
}) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'CarePhotoPdfCard');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setLocalUri(null);
    void loadCarePhotoLocalUri(photo.id, { bustCache: attempt > 0 }).then((uri) => {
      if (cancelled) return;
      setLoading(false);
      setFailed(!uri);
      if (uri) setLocalUri(uri);
    });
    return () => {
      cancelled = true;
    };
  }, [photo.id, attempt]);

  const openPreview = useCallback(async () => {
    if (onZoom) {
      onZoom();
      return;
    }
    let uri = localUri;
    if (!uri) {
      uri = await loadCarePhotoLocalUri(photo.id, { bustCache: false });
      if (!uri) {
        toast('Document indisponible', { type: 'warning' });
        return;
      }
      setLocalUri(uri);
    }
    setPreviewOpen(true);
  }, [localUri, onZoom, photo.id, toast]);

  const downloadPdf = useCallback(async () => {
    setDownloading(true);
    try {
      let uri = localUri;
      if (!uri) {
        uri = await loadCarePhotoLocalUri(photo.id, { bustCache: false });
        if (!uri) {
          toast('Document indisponible', { type: 'warning' });
          return;
        }
        setLocalUri(uri);
      }
      const res = await exportLocalFile(uri, label);
      if (!res.ok) toast(res.error ?? 'Impossible de télécharger le PDF', { type: 'warning' });
    } finally {
      setDownloading(false);
    }
  }, [label, localUri, photo.id, toast]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return (
    <>
      <Pressable
        style={[styles.pdfWrap, style]}
        onPress={() => void openPreview()}
        disabled={loading || failed}
        accessibilityRole="button"
        accessibilityLabel={`Aperçu ${label}`}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={c.primary} />
          </View>
        ) : failed ? (
          <Pressable style={styles.center} onPress={retry} accessibilityRole="button">
            <ImageOff size={iconSize.mdLg} color={c.textTertiary} strokeWidth={1.75} />
            <AppText style={styles.failText}>Document indisponible</AppText>
            <Row gap={4} align="center" style={styles.retryRow}>
              <RefreshCw size={iconSize['2xs']} color={c.primary} strokeWidth={2.5} />
              <AppText style={styles.retryText}>Réessayer</AppText>
            </Row>
          </Pressable>
        ) : (
          <View style={styles.pdfBody}>
            <View style={styles.pdfIconBox}>
              <FileText size={iconSize['2xl']} color={c.primary} strokeWidth={1.75} />
            </View>
            <AppText style={styles.pdfName} numberOfLines={2}>
              {label}
            </AppText>
            <Row gap={6} align="center" style={styles.openRow}>
              <Maximize2 size={iconSize.xs} color={c.primary} strokeWidth={2.5} />
              <AppText style={styles.openText}>Aperçu</AppText>
            </Row>
            <Pressable
              style={styles.downloadBtn}
              onPress={(e) => {
                e.stopPropagation?.();
                void downloadPdf();
              }}
              disabled={downloading}
              accessibilityRole="button"
              accessibilityLabel={`Télécharger ${label}`}
            >
              {downloading ? (
                <ActivityIndicator size="small" color={c.textSecondary} />
              ) : (
                <Row gap={6} align="center">
                  <Download size={iconSize.xs} color={c.textSecondary} strokeWidth={2.5} />
                  <AppText style={styles.downloadText}>Télécharger</AppText>
                </Row>
              )}
            </Pressable>
          </View>
        )}
        {!loading && !failed ? (
          <Row gap={5} align="center" style={styles.zoomPill}>
            <Maximize2 size={iconSize.xs} color={c.textInverse} strokeWidth={2.5} />
            <AppText style={styles.zoomPillText}>Aperçu</AppText>
          </Row>
        ) : null}
        {children}
      </Pressable>

      {!onZoom ? (
        <MedicalDocumentPreviewModal
          visible={previewOpen}
          localUri={localUri}
          fileName={label}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}
    </>
  );
}

function buildStyles(c: AppColors) {
  return {
  pdfWrap: {
    overflow: 'hidden' as const,
    backgroundColor: c.surfaceAlt,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: c.borderLight,
    minHeight: 160,
  },
  center: {
    minWidth: 0,
    flex: 1,
    minHeight: 160,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    padding: spacing[4],
  },
  failText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    textAlign: 'center' as const,
  },
  retryRow: {
    marginTop: 2,
  },
  retryText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primary,
  },
  pdfBody: {
    minWidth: 0,
    flex: 1,
    minHeight: 160,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: spacing[5],
    gap: spacing[2],
  },
  pdfIconBox: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  pdfName: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    textAlign: 'center' as const,
  },
  openRow: {
    marginTop: spacing[1],
  },
  openText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primary,
  },
  downloadBtn: {
    marginTop: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radius.full,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderLight,
  },
  downloadText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  zoomPill: {
    position: 'absolute' as const,
    bottom: spacing[3],
    right: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  zoomPillText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textInverse,
  },
};
}

