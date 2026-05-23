import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { colors, spacing } from '@/theme';

const FOOTER_HEIGHT = 48 + spacing[3] + spacing[3];

interface Props {
  children: ReactNode;
  saveTitle?: string;
  onSave?: () => void;
  saving?: boolean;
  hideSave?: boolean;
}

/** Écran secondaire profil : contenu scrollable + bouton Enregistrer au-dessus du clavier. */
export function ProfileSubScreenLayout({
  children,
  saveTitle = 'Enregistrer',
  onSave,
  saving,
  hideSave,
}: Props) {
  const { bottom } = useSafeAreaInsets();
  const footerInset = Math.max(bottom, spacing[2]);
  const showFooter = !hideSave && !!onSave;

  return (
    <View style={styles.root}>
      <KeyboardScrollView
        contentContainerStyle={[
          styles.scroll,
          showFooter && { paddingBottom: FOOTER_HEIGHT + footerInset + spacing[4] },
        ]}
        bottomOffset={showFooter ? FOOTER_HEIGHT + footerInset : footerInset}
      >
        {children}
      </KeyboardScrollView>
      {showFooter ? (
        <KeyboardStickyView offset={{ closed: 0, opened: footerInset }}>
          <View style={styles.footer}>
            <Button title={saveTitle} loading={saving} onPress={onSave} fullWidth size="lg" />
          </View>
        </KeyboardStickyView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: {
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[6],
  },
  footer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[6],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
});
