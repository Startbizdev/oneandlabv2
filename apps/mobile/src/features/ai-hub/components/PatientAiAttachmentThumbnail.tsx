import { useAppColors } from '@/theme/use-app-colors';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { FileText, X } from 'lucide-react-native';
import { isPdfMime } from '../utils/attachment-preview';
import { hexToRgba, MIN_TOUCH_TARGET, radius, spacing, iconSize, AppText, useStyles, type Theme, ICON_STROKE_WIDTH } from '@/theme';

export type PatientAiAttachmentPreview = {
  uri: string;
  fileName: string;
  mimeType: string;
  medicalDocumentId?: string;
  documentType?: string;
};

type Variant = 'composer' | 'message';

interface Props {
  attachment: PatientAiAttachmentPreview;
  variant?: Variant;
  loading?: boolean;
  compact?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
}

const COMPOSER_SIZE = 72;
const MESSAGE_WIDTH = 220;
const MESSAGE_IMAGE_HEIGHT = 160;
const REMOVE_SIZE = 24;
const REMOVE_HIT_SLOP = (MIN_TOUCH_TARGET - REMOVE_SIZE) / 2;

export function PatientAiAttachmentThumbnail({
  attachment,
  variant = 'composer',
  loading = false,
  compact = false,
  onPress,
  onRemove,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const isPdf = isPdfMime(attachment.mimeType, attachment.fileName);
  const isMessage = variant === 'message';
  const showFileTile = isPdf || !attachment.uri?.trim();

  const body = (
    <View
      style={[
        styles.tile,
        isMessage ? styles.tileMessage : styles.tileComposer,
        isMessage && compact ? styles.tileMessageCompact : null,
      ]}
    >
      {showFileTile ? (
        <View style={styles.fileTile}>
          <FileText size={iconSize.lg} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
          <AppText variant="caption" style={styles.fileName} numberOfLines={isMessage ? undefined : 2}>
            {attachment.fileName}
          </AppText>
        </View>
      ) : (
        <Image
          source={{ uri: attachment.uri }}
          style={isMessage ? styles.imageMessage : styles.imageComposer}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      )}
      {loading ? (
        <View style={[styles.loadingOverlay, { backgroundColor: hexToRgba(c.background, 0.8) }]}>
          <ActivityIndicator size="small" color={c.textSecondary} />
        </View>
      ) : null}
      {onRemove && !loading ? (
        <Pressable
          onPress={onRemove}
          hitSlop={REMOVE_HIT_SLOP}
          style={styles.removeBtn}
          accessibilityRole="button"
          accessibilityLabel="Retirer la pièce jointe"
        >
          <X size={iconSize.xs} color={c.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
        </Pressable>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Aperçu de ${attachment.fileName}`}>
        {body}
      </Pressable>
    );
  }

  return body;
}

function buildStyles({ colors: c }: Theme) {
  return {
    tile: {
      position: 'relative' as const,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      backgroundColor: c.surface,
      overflow: 'hidden' as const,
    },
    tileComposer: { width: COMPOSER_SIZE, height: COMPOSER_SIZE },
    tileMessage: { width: MESSAGE_WIDTH, marginBottom: spacing[1.5] },
    tileMessageCompact: { marginBottom: 0 },
    imageComposer: { width: COMPOSER_SIZE, height: COMPOSER_SIZE },
    imageMessage: { width: MESSAGE_WIDTH, height: MESSAGE_IMAGE_HEIGHT },
    fileTile: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing[1],
      padding: spacing[2],
    },
    fileName: { textAlign: 'center' as const },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    removeBtn: {
      position: 'absolute' as const,
      top: spacing[1],
      right: spacing[1],
      width: REMOVE_SIZE,
      height: REMOVE_SIZE,
      borderRadius: radius.full,
      backgroundColor: hexToRgba(c.textPrimary, 0.72),
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
  };
}
