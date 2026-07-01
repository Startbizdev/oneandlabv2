import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FileText, X } from 'lucide-react-native';
import { isPdfMime } from '../utils/attachment-preview';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

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
const MESSAGE_MAX_WIDTH = 220;

export function PatientAiAttachmentThumbnail({
  attachment,
  variant = 'composer',
  loading = false,
  compact = false,
  onPress,
  onRemove,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const isPdf = isPdfMime(attachment.mimeType, attachment.fileName);
  const isMessage = variant === 'message';

  const body = (
    <View
      style={[
        styles.tile,
        isMessage ? styles.tileMessage : styles.tileComposer,
        isMessage && compact ? styles.tileMessageCompact : null,
        { backgroundColor: c.surfaceAlt, borderColor: c.borderLight },
      ]}
    >
      {isPdf ? (
        <View style={[styles.pdfIconWrap, { backgroundColor: c.errorLight }]}>
          <FileText size={isMessage ? 28 : 24} color={c.error} strokeWidth={2} />
        </View>
      ) : (
        <Image
          source={{ uri: attachment.uri }}
          style={isMessage ? styles.imageMessage : styles.imageComposer}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
      )}
      {isPdf ? (
        <Text
          style={[styles.pdfName, { color: c.textSecondary }]}
          numberOfLines={2}
        >
          {attachment.fileName}
        </Text>
      ) : null}
      {loading ? (
        <View style={[styles.loadingOverlay, { backgroundColor: `${c.background}CC` }]}>
          <ActivityIndicator size="small" color={c.primary} />
        </View>
      ) : null}
      {onRemove && !loading ? (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          style={[styles.removeBtn, { backgroundColor: c.surface }]}
          accessibilityRole="button"
          accessibilityLabel="Retirer la pièce jointe"
        >
          <X size={14} color={c.textSecondary} strokeWidth={2.5} />
        </Pressable>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Aperçu du document">
        {body}
      </Pressable>
    );
  }

  return body;
}

function buildStyles(_c: AppColors) {
  return {
    tile: {
      position: 'relative' as const,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      overflow: 'hidden' as const,
    },
    tileComposer: {
      width: COMPOSER_SIZE,
      height: COMPOSER_SIZE,
    },
    tileMessage: {
      maxWidth: MESSAGE_MAX_WIDTH,
      minWidth: 140,
      marginBottom: spacing[1.5],
    },
    tileMessageCompact: {
      marginBottom: 0,
    },
    imageComposer: {
      width: COMPOSER_SIZE,
      height: COMPOSER_SIZE,
    },
    imageMessage: {
      width: MESSAGE_MAX_WIDTH,
      height: 160,
      borderRadius: radius.md,
    },
    pdfIconWrap: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingTop: spacing[2],
      paddingBottom: spacing[1],
    },
    pdfName: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize['2xs'],
      paddingHorizontal: spacing[2],
      paddingBottom: spacing[2],
      textAlign: 'center' as const,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    removeBtn: {
      position: 'absolute' as const,
      top: spacing[1],
      right: spacing[1],
      width: 24,
      height: 24,
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      ...StyleSheet.flatten({
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 2,
        elevation: 2,
      }),
    },
  };
}
