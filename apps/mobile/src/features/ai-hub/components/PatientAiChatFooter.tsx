import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNativeTabBarInset } from '@/navigation/use-native-tab-bar-inset';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { PatientAiChatComposer, PATIENT_AI_COMPOSER_DOCK_HEIGHT } from './PatientAiChatComposer';
import { H_PADDING, spacing, AppText } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';

interface Props {
  draft: string;
  onChangeDraft: (text: string) => void;
  onSend: () => void;
  onVoicePress: () => void;
  onAttachPress?: () => void;
  onClearAttachment?: () => void;
  onPreviewPress?: () => void;
  pendingAttachment?: import('./PatientAiChatComposer').PatientAiPendingAttachment | null;
  attaching?: boolean;
  onFocusInput?: () => void;
  onFooterLayout?: (height: number) => void;
  canSend: boolean;
  disabled?: boolean;
  disclaimer?: string;
  /** false sur écran stack (pas de tab bar) — safe area bas uniquement. */
  includeTabBarInset?: boolean;
}

/** Hauteur bandeau disclaimer (estimation — layout réel via onLayout). */
const DISCLAIMER_BLOCK_HEIGHT = spacing[1] * 2 + lh(fontSize['2xs'], 1.35) * 3;

/** Footer complet : disclaimer + compositeur (réserve scroll liste). */
export const PATIENT_AI_FOOTER_HEIGHT_WITH_DISCLAIMER =
  DISCLAIMER_BLOCK_HEIGHT + PATIENT_AI_COMPOSER_DOCK_HEIGHT;

/** Réserve bas de liste (compositeur + tab bar native) — paddingBottom sur liste chronologique. */
export function patientAiChatListBottomPadding(footerHeight: number, tabBarInset: number): number {
  return footerHeight + tabBarInset + spacing[3];
}

/** @deprecated alias mock — préférer PATIENT_AI_FOOTER_HEIGHT_WITH_DISCLAIMER */
export const PATIENT_AI_FOOTER_HEIGHT_WITH_BANNER = PATIENT_AI_FOOTER_HEIGHT_WITH_DISCLAIMER;

/** Footer Cary — dock fixe bas d'écran, fond opaque (ne chevauche plus le fil). */
export function PatientAiChatFooter({
  draft,
  onChangeDraft,
  onSend,
  onVoicePress,
  onAttachPress,
  onClearAttachment,
  onPreviewPress,
  pendingAttachment,
  attaching,
  onFocusInput,
  onFooterLayout,
  canSend,
  disabled,
  disclaimer,
  includeTabBarInset = true,
}: Props) {
  const styles = useThemedStyles(buildStyles);
  const c = useAppColors();
  const { bottom: safeBottom } = useSafeAreaInsets();
  const tabBarInset = useNativeTabBarInset(0);
  const bottomInset = includeTabBarInset ? tabBarInset : safeBottom;
  const [inputFocused, setInputFocused] = useState(false);

  return (
    <KeyboardStickyView
      style={[styles.footer, { bottom: bottomInset, backgroundColor: 'transparent' }]}
      offset={{ closed: 0, opened: bottomInset }}
    >
      <View
        onLayout={(event) => onFooterLayout?.(event.nativeEvent.layout.height)}
        style={[
          styles.shell,
          { backgroundColor: c.background, borderTopColor: c.borderLight },
        ]}
      >
        {!inputFocused && disclaimer ? (
          <View style={[styles.disclaimerWrap, { backgroundColor: c.surfaceAlt }]}>
            <AppText style={[styles.disclaimer, { color: c.textTertiary }]}>
              {disclaimer}
            </AppText>
          </View>
        ) : null}
        <PatientAiChatComposer
          draft={draft}
          onChangeDraft={onChangeDraft}
          onSend={onSend}
          onVoicePress={onVoicePress}
          onAttachPress={onAttachPress}
          onClearAttachment={onClearAttachment}
          onPreviewPress={onPreviewPress}
          pendingAttachment={pendingAttachment}
          attaching={attaching}
          onFocus={() => {
            setInputFocused(true);
            onFocusInput?.();
          }}
          onBlur={() => setInputFocused(false)}
          canSend={canSend}
          disabled={disabled}
          embedded
        />
      </View>
    </KeyboardStickyView>
  );
}

function buildStyles(_c: AppColors) {
  return {
    footer: {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      zIndex: 2,
    },
    shell: {
      width: '100%' as const,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    disclaimerWrap: {
      paddingHorizontal: H_PADDING,
      paddingTop: spacing[1.5],
      paddingBottom: spacing[1],
    },
    disclaimer: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize['2xs'],
      lineHeight: lh(fontSize['2xs'], 1.35),
    },
  };
}
