import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { colors, spacing } from '@/theme';

interface Props {
  children: ReactNode;
  saveTitle?: string;
  onSave?: () => void;
  saving?: boolean;
  hideSave?: boolean;
}

/** Écran secondaire profil : formulaire scrollable, CTA en bas du contenu (pas de barre fixe). */
export function ProfileSubScreenLayout({
  children,
  saveTitle = 'Enregistrer',
  onSave,
  saving,
  hideSave,
}: Props) {
  const { bottom } = useSafeAreaInsets();
  const bottomInset = Math.max(bottom, spacing[2]);
  const showSave = !hideSave && !!onSave;

  return (
    <KeyboardScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: bottomInset + spacing[4] },
      ]}
      bottomOffset={bottomInset}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
      {showSave ? (
        <View style={styles.saveBlock}>
          <Button title={saveTitle} loading={saving} onPress={onSave} fullWidth size="lg" />
        </View>
      ) : null}
    </KeyboardScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing[4],
    gap: spacing[4],
    flexGrow: 1,
  },
  saveBlock: {
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
});
