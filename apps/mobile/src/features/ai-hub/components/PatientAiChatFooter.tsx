import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSceneBottomInset } from '@/navigation/use-scene-bottom-inset';
import {
  PatientAiChatComposer,
  PATIENT_AI_COMPOSER_DOCK_HEIGHT,
  type PatientAiPendingAttachment,
} from './PatientAiChatComposer';
import { CARY_AI_NOTICE, CaryAiEmergencyLine } from './CaryAiDisclosure';
import { FONT_SIZE_BASE, H_PADDING, lh, spacing, useStyles, type Theme } from '@/theme';

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
  onFocusInput?: () => void;
  onFooterLayout?: (height: number) => void;
  canSend: boolean;
  disabled?: boolean;
}

/** Hauteur estimée du rappel (1 ligne de légende) — la mesure réelle arrive via onLayout. */
const DISCLAIMER_BLOCK_HEIGHT = spacing[1] + lh(FONT_SIZE_BASE.xs, 1.4);

/** Footer complet : rappel + compositeur (réserve de scroll de la liste). */
export const PATIENT_AI_FOOTER_HEIGHT_WITH_DISCLAIMER =
  DISCLAIMER_BLOCK_HEIGHT + PATIENT_AI_COMPOSER_DOCK_HEIGHT;

/** Réserve bas de liste (compositeur + safe area) — paddingBottom sur liste chronologique. */
export function patientAiChatListBottomPadding(footerHeight: number, bottomInset: number): number {
  return footerHeight + bottomInset + spacing[3];
}

/** Dock bas d'écran : rappel médical (masqué pendant la saisie) puis compositeur. */
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
}: Props) {
  const styles = useStyles(buildStyles);
  const { safeAreaBottom, tabBarHeight } = useSceneBottomInset();
  const [inputFocused, setInputFocused] = useState(false);

  return (
    <KeyboardStickyView
      style={[styles.footer, { bottom: safeAreaBottom }]}
      offset={{ closed: 0, opened: tabBarHeight + safeAreaBottom }}
    >
      <View onLayout={(event) => onFooterLayout?.(event.nativeEvent.layout.height)} style={styles.shell}>
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
        />
        {!inputFocused ? (
          <View style={styles.disclaimerWrap}>
            <CaryAiEmergencyLine lead={CARY_AI_NOTICE} centered />
          </View>
        ) : null}
      </View>
    </KeyboardStickyView>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    footer: {
      position: 'absolute' as const,
      left: 0,
      right: 0,
      zIndex: 2,
    },
    shell: {
      width: '100%' as const,
      backgroundColor: c.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
    },
    disclaimerWrap: {
      paddingHorizontal: H_PADDING,
      paddingBottom: spacing[1],
    },
  };
}
