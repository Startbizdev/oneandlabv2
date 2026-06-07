import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Mic, Send } from 'lucide-react-native';
import { elevation, H_PADDING, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const BAR_HEIGHT = 48;

/** Hauteur estimée du dock (hors clavier) — pour référence externe si besoin. */
export const PATIENT_AI_COMPOSER_DOCK_HEIGHT = spacing[2] + BAR_HEIGHT + spacing[2];

interface Props {
  draft: string;
  onChangeDraft: (text: string) => void;
  onSend: () => void;
  onVoicePress: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  canSend: boolean;
  disabled?: boolean;
}

/** Barre de saisie Cary IA — dock blanc, micro intégré à droite dans le champ. */
export function PatientAiChatComposer({
  draft,
  onChangeDraft,
  onSend,
  onVoicePress,
  onFocus,
  onBlur,
  canSend,
  disabled = false,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);

  return (
    <View
      style={[
        styles.dock,
        {
          backgroundColor: c.surface,
          borderTopColor: c.borderLight,
        },
      ]}
    >
        <View
          style={[
            styles.bar,
            { backgroundColor: c.surfaceAlt, borderColor: c.borderLight },
          ]}
        >
          <TextInput
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

          {canSend ? (
            <Pressable
              onPress={onSend}
              disabled={disabled}
              style={({ pressed }) => [
                styles.actionBtn,
                pressed && styles.btnPressed,
                disabled && styles.btnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Envoyer le message"
              hitSlop={6}
            >
              <View style={[styles.actionIcon, { backgroundColor: c.primary }]}>
                <Send size={18} color={c.textInverse} strokeWidth={2.25} />
              </View>
            </Pressable>
          ) : (
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
          )}
        </View>
    </View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    dock: {
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingTop: spacing[2],
      paddingBottom: spacing[2],
      paddingHorizontal: H_PADDING,
      ...elevation.sm,
    },
    bar: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      minHeight: BAR_HEIGHT,
      maxHeight: 120,
      borderRadius: radius.xl,
      borderWidth: 1,
      paddingLeft: spacing[3.5],
      paddingRight: spacing[1.5],
      paddingVertical: Platform.OS === 'ios' ? spacing[1] : spacing[0.5],
    },
    input: {
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
      marginLeft: spacing[1.5],
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
