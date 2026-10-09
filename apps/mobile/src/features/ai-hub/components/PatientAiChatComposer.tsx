import { useAppColors } from '@/theme/use-app-colors';
import { forwardRef } from 'react';
import { ActivityIndicator, Platform, Pressable, TextInput, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { ArrowUp, Mic, Plus, Square } from 'lucide-react-native';
import {
  AppText,
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
import { AI_MESSAGE_MAX_LENGTH, formatAiMessageMaxLength } from '../utils/ai-chat-errors';
import {
  PatientAiAttachmentThumbnail,
  type PatientAiAttachmentPreview,
} from './PatientAiAttachmentThumbnail';

const SEND_DISC = 36;
const INPUT_MAX_HEIGHT = 120;
/** Le compteur apparaît à partir de 90 % de la longueur maximale. */
const COUNTER_FROM = Math.round(AI_MESSAGE_MAX_LENGTH * 0.9);

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
  /** Réponse en cours : le bouton d'envoi devient « Arrêter ». */
  generating?: boolean;
  onStop?: () => void;
}

/** Saisie Cary : [+ | champ | micro | envoyer ou arrêter]. Seul le bouton actif est turquoise. */
export const PatientAiChatComposer = forwardRef<TextInput, Props>(function PatientAiChatComposer(
  {
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
    generating = false,
    onStop,
  },
  inputRef,
) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const canAttach = Boolean(onAttachPress) && !disabled && !attaching;
  const sendEnabled = canSend && !disabled;
  const tooLong = draft.length > AI_MESSAGE_MAX_LENGTH;

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
          ref={inputRef}
          nativeID="cary-ai-input"
          style={styles.input}
          placeholder="Écrire à Cary…"
          placeholderTextColor={c.textTertiary}
          value={draft}
          onChangeText={onChangeDraft}
          onFocus={onFocus}
          onBlur={onBlur}
          editable={!disabled}
          multiline
          textAlignVertical="center"
          accessibilityLabel="Message pour Cary"
        />

        <Pressable
          onPress={onVoicePress}
          disabled={disabled || generating}
          style={[styles.iconBtn, (disabled || generating) && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel="Parler à Cary"
        >
          <Mic size={iconSize.lg} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
        </Pressable>

        {generating && onStop ? (
          <Pressable
            onPress={onStop}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Arrêter la réponse"
          >
            <View style={[styles.sendDisc, { backgroundColor: c.textPrimary }]}>
              <Square size={iconSize.xs} color={c.surface} fill={c.surface} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
          </Pressable>
        ) : (
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
        )}
      </Row>

      {draft.length >= COUNTER_FROM ? (
        <AppText
          variant="caption"
          style={[styles.counter, tooLong && styles.counterError]}
          accessibilityLiveRegion="polite"
        >
          {tooLong
            ? `Message trop long : ${draft.length} / ${formatAiMessageMaxLength()} caractères`
            : `${draft.length} / ${formatAiMessageMaxLength()} caractères`}
        </AppText>
      ) : null}
    </View>
  );
});

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
    counter: { textAlign: 'right' as const, paddingTop: spacing[1], paddingHorizontal: spacing[1] },
    counterError: { color: c.error },
  };
}
