import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { PatientAiChatComposer, PATIENT_AI_COMPOSER_DOCK_HEIGHT } from './PatientAiChatComposer';
import { PatientAiDemoBanner } from './PatientAiDemoBanner';
import { spacing } from '@/theme';

interface Props {
  draft: string;
  onChangeDraft: (text: string) => void;
  onSend: () => void;
  onVoicePress: () => void;
  onFocusInput?: () => void;
  canSend: boolean;
  disabled?: boolean;
}

/** Footer Cary — collé au clavier (compensation tab bar). */
export function PatientAiChatFooter({
  draft,
  onChangeDraft,
  onSend,
  onVoicePress,
  onFocusInput,
  canSend,
  disabled,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'features_ai_hub_components_PatientAiChatFooter_tsx_PatientAiChatFooter_styles');

  const tabBarHeight = useBottomTabBarHeight();
  const [inputFocused, setInputFocused] = useState(false);

  return (
    <KeyboardStickyView
      style={styles.footer}
      offset={{ closed: 0, opened: tabBarHeight }}
    >
      <View style={styles.footerInner}>
        {!inputFocused ? <PatientAiDemoBanner /> : null}
        <PatientAiChatComposer
          draft={draft}
          onChangeDraft={onChangeDraft}
          onSend={onSend}
          onVoicePress={onVoicePress}
          onFocus={() => {
            setInputFocused(true);
            onFocusInput?.();
          }}
          onBlur={() => setInputFocused(false)}
          canSend={canSend}
          disabled={disabled}
        />
      </View>
    </KeyboardStickyView>
  );
}



/** Hauteur footer avec bandeau démo (référence padding liste). */
export const PATIENT_AI_FOOTER_HEIGHT_WITH_BANNER =
  spacing[2] * 2 + 14 + PATIENT_AI_COMPOSER_DOCK_HEIGHT;

/** Hauteur footer clavier ouvert (sans bandeau). */
export const PATIENT_AI_FOOTER_HEIGHT_COMPACT = PATIENT_AI_COMPOSER_DOCK_HEIGHT;

function buildStyles(c: AppColors) {
  return {
  footer: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
  },
  footerInner: {
    width: '100%' as const,
  },
};
}
