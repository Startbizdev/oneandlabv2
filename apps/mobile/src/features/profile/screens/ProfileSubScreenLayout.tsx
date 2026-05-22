import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/theme';

interface Props {
  children: ReactNode;
  saveTitle?: string;
  onSave?: () => void;
  saving?: boolean;
  hideSave?: boolean;
}

/** Écran secondaire profil : contenu scrollable + bouton Enregistrer optionnel. */
export function ProfileSubScreenLayout({
  children,
  saveTitle = 'Enregistrer',
  onSave,
  saving,
  hideSave,
}: Props) {
  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {!hideSave && onSave ? (
        <View style={styles.footer}>
          <Button title={saveTitle} loading={saving} onPress={onSave} fullWidth size="lg" />
        </View>
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
