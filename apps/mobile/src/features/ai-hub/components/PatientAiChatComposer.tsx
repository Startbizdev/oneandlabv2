import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { Mic, Plus, Send } from 'lucide-react-native';
import { elevation, H_PADDING, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import {
  PatientAiAttachmentThumbnail,
  type PatientAiAttachmentPreview,
} from './PatientAiAttachmentThumbnail';

const BAR_HEIGHT = 48;
const ATTACHMENT_PREVIEW_HEIGHT = 72;

/** Hauteur estimée du dock (hors clavier) — pour référence externe si besoin. */
export const PATIENT_AI_COMPOSER_DOCK_HEIGHT = spacing[2] + BAR_HEIGHT + spacing[2];

export const PATIENT_AI_COMPOSER_ATTACHMENT_EXTRA = ATTACHMENT_PREVIEW_HEIGHT + spacing[2];

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
  /** Dans le footer Cary — pas de double bordure / ombre. */
  embedded?: boolean;
}

/** Barre de saisie Cary IA — aperçu pièce jointe + micro et envoi visibles. */
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
  embedded = false,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const canAttach = Boolean(onAttachPress) && !disabled && !attaching;

  return (
    <View style={embedded ? styles.dockEmbedded : styles.dockStandalone}>
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

      <Row
        align="end"
        style={[styles.bar, { backgroundColor: c.surface, borderColor: c.borderLight }]}
      >
        {onAttachPress ? (
          <Pressable
            onPress={onAttachPress}
            disabled={!canAttach}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionBtnLeft,
              pressed && styles.btnPressed,
              !canAttach && styles.btnDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Joindre un document ou une photo"
            hitSlop={6}
          >
            <View style={[styles.actionIcon, { backgroundColor: c.surfaceAlt }]}>
              {attaching ? (
                <ActivityIndicator size="small" color={c.primary} />
              ) : (
                <Plus size={20} color={c.textSecondary} strokeWidth={2.25} />
              )}
            </View>
          </Pressable>
        ) : null}

        <TextInput
          nativeID="cary-ai-input"
          style={[styles.input, { color: c.textPrimary }]}
          placeholder="Posez votre question à Cary…"
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
        />

        <Pressable
          onPress={onVoicePress}
          disabled={disabled}
          style={({ pressed }) => [
            styles.actionBtn,
            pressed && styles.btnPressed,
            disabled && styles.btnDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Parler à Cary"
          hitSlop={6}
        >
          <View style={[styles.actionIcon, { backgroundColor: c.primary }]}>
            <Mic size={20} color={c.textInverse} strokeWidth={2.5} />
          </View>
        </Pressable>

        <Pressable
          onPress={onSend}
          disabled={disabled || !canSend}
          style={({ pressed }) => [
            styles.actionBtn,
            pressed && canSend && styles.btnPressed,
            (disabled || !canSend) && styles.btnDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Envoyer le message"
          hitSlop={6}
        >
          <View
            style={[
              styles.actionIcon,
              { backgroundColor: canSend && !disabled ? c.primary : c.surfaceAlt },
            ]}
          >
            <Send
              size={18}
              color={canSend && !disabled ? c.textInverse : c.textTertiary}
              strokeWidth={2.25}
            />
          </View>
        </Pressable>
      </Row>
    </View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    dockStandalone: {
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingTop: spacing[2],
      paddingBottom: spacing[2],
      paddingHorizontal: H_PADDING,
    },
    dockEmbedded: {
      paddingTop: spacing[1.5],
      paddingBottom: spacing[2],
      paddingHorizontal: H_PADDING,
    },
    previewRow: {
      marginBottom: spacing[2],
      alignSelf: 'flex-start' as const,
    },
    bar: {
      width: '100%' as const,
      minHeight: BAR_HEIGHT,
      maxHeight: 120,
      borderRadius: radius.xl,
      borderWidth: 1,
      paddingLeft: spacing[1.5],
      paddingRight: spacing[1.5],
      paddingVertical: Platform.OS === 'ios' ? spacing[1] : spacing[0.5],
      ...elevation.xs,
    },
    input: {
      minWidth: 0,
      flex: 1,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      padding: 0,
      margin: 0,
      maxHeight: 96,
      paddingVertical: Platform.OS === 'ios' ? spacing[1.5] : spacing[1],
    },
    actionBtn: {
      flexShrink: 0,
      marginLeft: spacing[1],
    },
    actionBtnLeft: {
      marginLeft: 0,
      marginRight: spacing[1],
    },
    actionIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    btnPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.94 }],
    },
    btnDisabled: {
      opacity: 0.45,
    },
  };
}
