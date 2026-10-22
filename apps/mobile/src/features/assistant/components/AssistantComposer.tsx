import { memo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { ArrowUp, FileText, Mic, Paperclip, Square, X } from 'lucide-react-native';
import { useSceneBottomInset } from '@/navigation/use-scene-bottom-inset';
import { AppText, H_PADDING, ICON_STROKE_WIDTH, MIN_TOUCH_TARGET, font, iconSize, radius, spacing, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { ASSISTANT_MESSAGE_MAX_LENGTH } from '../utils/assistant-errors';
import type { VoiceState } from '../utils/voice-controller';
import { VoicePanel } from './VoicePanel';

const DISC = 36;
const INPUT_MAX_HEIGHT = 140;

export type ComposerAttachment = { fileName: string; uploading: boolean };

type Props = {
  /** `true` si le message part : le champ est alors vidé. */
  onSend: (text: string) => boolean;
  onStop: () => void;
  streaming: boolean;
  voice: VoiceState;
  onMicPress: () => void;
  onExitVoice: () => void;
  onAttach?: () => void;
  attachment: ComposerAttachment | null;
  onClearAttachment: () => void;
};

/**
 * Bas d'écran : [trombone | champ | micro, envoyer ou arrêter] puis réserve clavier / safe area ;
 * en mode vocal, le panneau micro prend la place du champ. Le brouillon reste local : taper ne re-rend pas le fil.
 */
export const AssistantComposer = memo(function AssistantComposer({
  onSend,
  onStop,
  streaming,
  voice,
  onMicPress,
  onExitVoice,
  onAttach,
  attachment,
  onClearAttachment,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const [draft, setDraft] = useState('');
  const { safeAreaBottom, tabBarHeight } = useSceneBottomInset();
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const keyboardSpace = useAnimatedStyle(() => ({
    height: Math.max(safeAreaBottom, -keyboardHeight.value - tabBarHeight),
  }));

  const tooLong = draft.length > ASSISTANT_MESSAGE_MAX_LENGTH;
  const hasContent = draft.trim().length > 0 || Boolean(attachment);
  const canSend = !streaming && !tooLong && !attachment?.uploading && hasContent;

  const send = () => {
    if (canSend && onSend(draft)) setDraft('');
  };

  if (voice.phase !== 'idle') {
    return (
      <View style={styles.shell}>
        <VoicePanel state={voice} onMicPress={onMicPress} onExit={onExitVoice} />
        <Animated.View style={keyboardSpace} />
      </View>
    );
  }

  const trailing = streaming ? (
    <Pressable onPress={onStop} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Arrêter la réponse">
      <View style={[styles.disc, styles.stopDisc]}>
        <Square size={iconSize.xs} color={c.surface} fill={c.surface} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
    </Pressable>
  ) : hasContent ? (
    <Pressable
      onPress={send}
      disabled={!canSend}
      style={styles.iconBtn}
      accessibilityRole="button"
      accessibilityLabel="Envoyer le message"
      accessibilityState={{ disabled: !canSend }}
    >
      <View style={[styles.disc, canSend ? styles.sendDisc : styles.idleDisc]}>
        <ArrowUp size={iconSize.md} color={c.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
    </Pressable>
  ) : (
    <Pressable onPress={onMicPress} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Parler à Cary">
      <Mic size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
    </Pressable>
  );

  return (
    <View style={styles.shell}>
      {voice.error ? (
        <AppText variant="caption" style={styles.error} accessibilityRole="alert">
          {voice.error}
        </AppText>
      ) : null}
      {attachment ? (
        <View style={styles.chip}>
          {attachment.uploading ? (
            <ActivityIndicator size="small" color={c.textSecondary} />
          ) : (
            <FileText size={iconSize.sm} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
          )}
          <AppText variant="caption" style={styles.chipName} numberOfLines={1}>
            {attachment.fileName}
          </AppText>
          <Pressable onPress={onClearAttachment} hitSlop={spacing[3]} accessibilityRole="button" accessibilityLabel="Retirer la pièce jointe">
            <X size={iconSize.sm} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.field}>
        {onAttach ? (
          <Pressable
            onPress={onAttach}
            disabled={streaming || Boolean(attachment)}
            style={[styles.iconBtn, (streaming || attachment) && styles.disabled]}
            accessibilityRole="button"
            accessibilityLabel="Joindre une photo ou un PDF"
          >
            <Paperclip size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
          </Pressable>
        ) : null}
        <TextInput
          style={styles.input}
          placeholder="Écrire à Cary…"
          placeholderTextColor={c.textTertiary}
          value={draft}
          onChangeText={setDraft}
          multiline
          accessibilityLabel="Message pour Cary"
        />
        {trailing}
      </View>
      {tooLong ? (
        <AppText variant="caption" style={styles.error} accessibilityLiveRegion="polite">
          {`Message trop long : ${draft.length} / ${ASSISTANT_MESSAGE_MAX_LENGTH} caractères`}
        </AppText>
      ) : (
        <AppText variant="caption" style={styles.notice}>
          IA, pas un avis médical
        </AppText>
      )}
      <Animated.View style={keyboardSpace} />
    </View>
  );
});

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    shell: { paddingTop: spacing[2], paddingHorizontal: H_PADDING, gap: spacing[1.5], backgroundColor: c.background },
    chip: {
      alignSelf: 'flex-start' as const,
      maxWidth: '100%' as const,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.full,
      backgroundColor: c.surfaceAlt,
    },
    chipName: { flexShrink: 1, minWidth: 0 },
    field: {
      minHeight: MIN_TOUCH_TARGET + spacing[2],
      flexDirection: 'row' as const,
      alignItems: 'flex-end' as const,
      padding: spacing[0.5],
      borderRadius: radius['2xl'],
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    input: {
      flex: 1,
      minWidth: 0,
      ...font.regular,
      fontSize: fontSize.base,
      color: c.textPrimary,
      maxHeight: INPUT_MAX_HEIGHT,
      paddingHorizontal: spacing[2],
      paddingVertical: Platform.OS === 'ios' ? spacing[3] : spacing[2.5],
    },
    iconBtn: {
      width: MIN_TOUCH_TARGET,
      height: MIN_TOUCH_TARGET,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    disc: {
      width: DISC,
      height: DISC,
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    sendDisc: { backgroundColor: c.primary },
    idleDisc: { backgroundColor: c.border },
    stopDisc: { backgroundColor: c.textPrimary },
    disabled: { opacity: 0.45 },
    error: { color: c.error },
    notice: { textAlign: 'center' as const, color: c.textTertiary },
  };
}
