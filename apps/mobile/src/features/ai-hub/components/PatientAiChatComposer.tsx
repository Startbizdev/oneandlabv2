import { useAppColors } from '@/theme/use-app-colors';
import { ActivityIndicator, Platform, Pressable, TextInput, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { ArrowUp, Mic, Plus } from 'lucide-react-native';
import {
  H_PADDING,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  iconSize,
  useStyles,
  font,
  type Theme,
  ICON_STROKE_WIDTH,
} from '@/theme';
import {
  PatientAiAttachmentThumbnail,
  type PatientAiAttachmentPreview,
} from './PatientAiAttachmentThumbnail';

const SEND_DISC = 36;
const INPUT_MAX_HEIGHT = 120;

/** Hauteur estimée du dock (hors clavier et pièce jointe) — réserve de scroll avant la mesure réelle. */
export const PATIENT_AI_COMPOSER_DOCK_HEIGHT = spacing[2] + MIN_TOUCH_TARGET + spacing[2];

export type PatientAiPendingAttachment = PatientAiAttachmentPreview;

interface Props {
  draft: string;
  onChangeDraft: (text: string) => void;
  onSend: () => void;
  onVoicePress: () => void;
  onAttachPress?: () => void;
  onClearAttachment?: () => void;
  onPreviewPress?: () => void;
  pendingAttachment?: PatientAiPendingAttachment | null;
  attaching?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  canSend: boolean;
  disabled?: boolean;
}

/** Saisie Cary : [+ | champ | micro | envoyer]. Seul l'envoi actif est turquoise. */
export function PatientAiChatComposer({
  draft,
  onChangeDraft,
  onSend,
  onVoicePress,
  onAttachPress,
  onClearAttachment,
  onPreviewPress,
  pendingAttachment,
  attaching,
  onFocus,
  onBlur,
  canSend,
  disabled = false,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const canAttach = Boolean(onAttachPress) && !disabled && !attaching;
  const sendEnabled = canSend && !disabled;

  return (
    <View style={styles.dock}>
      {pendingAttachment ? (
        <View style={styles.previewRow}>
          <PatientAiAttachmentThumbnail
            attachment={pendingAttachment}
            variant="composer"
            loading={attaching}
            onRemove={onClearAttachment}
            onPress={!attaching && onPreviewPress ? onPreviewPress : undefined}
          />
        </View>
      ) : null}

      <Row align="end" gap={spacing[1]} style={styles.bar}>
        {onAttachPress ? (
          <Pressable
            onPress={onAttachPress}
            disabled={!canAttach}
            style={[styles.iconBtn, !canAttach && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel="Joindre un document ou une photo"
          >
            {attaching ? (
              <ActivityIndicator size="small" color={c.textSecondary} />
            ) : (
              <Plus size={iconSize.lg} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
            )}
          </Pressable>
        ) : null}

        <TextInput
          nativeID="cary-ai-input"
          style={styles.input}
          placeholder="Écrire à Cary…"
          placeholderTextColor={c.textTertiary}
          value={draft}
          onChangeText={onChangeDraft}
          onSubmitEditing={onSend}
          onFocus={onFocus}
          onBlur={onBlur}
          returnKeyType="send"
          editable={!disabled}
          multiline
          maxLength={2000}
          textAlignVertical="center"
          accessibilityLabel="Message pour Cary"
        />

        <Pressable
          onPress={onVoicePress}
          disabled={disabled}
          style={[styles.iconBtn, disabled && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel="Parler à Cary"
        >
          <Mic size={iconSize.lg} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
        </Pressable>

        <Pressable
          onPress={onSend}
          disabled={!sendEnabled}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Envoyer le message"
          accessibilityState={{ disabled: !sendEnabled }}
        >
          <View style={[styles.sendDisc, { backgroundColor: sendEnabled ? c.primary : c.border }]}>
            <ArrowUp size={iconSize.md} color={sendEnabled ? c.onPrimary : c.surface} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
        </Pressable>
      </Row>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    dock: {
      paddingTop: spacing[2],
      paddingBottom: spacing[2],
      paddingHorizontal: H_PADDING,
    },
    previewRow: {
      marginBottom: spacing[2],
      alignSelf: 'flex-start' as const,
    },
    bar: {
      width: '100%' as const,
      minHeight: MIN_TOUCH_TARGET,
      borderRadius: radius.xl,
      backgroundColor: c.surfaceAlt,
      paddingHorizontal: spacing[1],
    },
    input: {
      minWidth: 0,
      flex: 1,
      ...font.regular,
      fontSize: fontSize.base,
      color: c.textPrimary,
      margin: 0,
      maxHeight: INPUT_MAX_HEIGHT,
      paddingHorizontal: spacing[1],
      paddingVertical: Platform.OS === 'ios' ? spacing[3] : spacing[2],
    },
    iconBtn: {
      width: MIN_TOUCH_TARGET,
      height: MIN_TOUCH_TARGET,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    sendDisc: {
      width: SEND_DISC,
      height: SEND_DISC,
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    disabled: { opacity: 0.45 },
  };
}
