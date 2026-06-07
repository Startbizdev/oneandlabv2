import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Download, FileText, ImageOff, Maximize2, RefreshCw } from 'lucide-react-native';
import type { CarePhotoRow } from '../../api/appointment-detail.service';
import { carePhotoAttachmentLabel, isCarePhotoPdf } from '../../utils/care-photo-file';
import { loadCarePhotoLocalUri } from '../../utils/care-photo-image';
import { CarePhotoImage } from './CarePhotoImage';
import { openLocalFile } from '@/lib/downloads/open-local-file';
import { useToast } from '@/providers/ToastProvider';
import { radius, spacing } from '@/theme';
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
      toast={toast}
      children={children}
    />
  );
}

function CarePhotoPdfCard({
  photo,
  style,
  label,
  toast,
  children,
}: {
  photo: CarePhotoRow;
  style?: StyleProp<ViewStyle>;
  label: string;
  toast: (msg: string, opts?: { type?: 'success' | 'warning' | 'error' }) => void;
  children?: React.ReactNode;
}) {
  const [opening, setOpening] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    void loadCarePhotoLocalUri(photo.id, { bustCache: attempt > 0 }).then((uri) => {
      if (cancelled) return;
      setLoading(false);
      setFailed(!uri);
    });
    return () => {
      cancelled = true;
    };
  }, [photo.id, attempt]);

  const openPdf = useCallback(async () => {
    setOpening(true);
    try {
      const uri = await loadCarePhotoLocalUri(photo.id, { bustCache: false });
      if (!uri) {
        toast('Document indisponible', { type: 'warning' });
        return;
      }
      const res = await openLocalFile(uri, label);
      if (!res.ok) toast(res.error ?? 'Impossible d’ouvrir le PDF', { type: 'warning' });
    } finally {
      setOpening(false);
    }
  }, [photo.id, label, toast]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return (
    <Pressable
      style={[styles.pdfWrap, style]}
      onPress={() => void openPdf()}
      disabled={opening || loading || failed}
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir ${label}`}
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : failed ? (
        <Pressable style={styles.center} onPress={retry} accessibilityRole="button">
          <ImageOff size={22} color={colors.textTertiary} strokeWidth={1.75} />
          <Text style={styles.failText}>Document indisponible</Text>
          <View style={styles.retryRow}>
            <RefreshCw size={12} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.retryText}>Réessayer</Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.pdfBody}>
          <View style={styles.pdfIconBox}>
            <FileText size={32} color={colors.primary} strokeWidth={1.75} />
          </View>
          <Text style={styles.pdfName} numberOfLines={2}>
            {label}
          </Text>
          <View style={styles.openRow}>
            {opening ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Download size={14} color={colors.primary} strokeWidth={2.5} />
                <Text style={styles.openText}>Ouvrir le PDF</Text>
              </>
            )}
          </View>
        </View>
      )}
      {!loading && !failed ? (
        <View style={styles.zoomPill}>
          <Maximize2 size={14} color={colors.textInverse} strokeWidth={2.5} />
          <Text style={styles.zoomPillText}>PDF</Text>
        </View>
      ) : null}
      {children}
    </Pressable>
  );
}

function buildStyles(c: AppColors) {
  return {
  pdfWrap: {
    overflow: 'hidden',
    backgroundColor: c.surfaceAlt,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: c.borderLight,
    minHeight: 160,
  },
  center: {
    flex: 1,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: spacing[4],
  },
  failText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    textAlign: 'center',
  },
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  retryText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primary,
  },
  pdfBody: {
    flex: 1,
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[5],
    gap: spacing[2],
  },
  pdfIconBox: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfName: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    textAlign: 'center',
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing[1],
  },
  openText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primary,
  },
  zoomPill: {
    position: 'absolute',
    bottom: spacing[3],
    right: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_detail_components_blocks_CarePhotoAttachment_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
