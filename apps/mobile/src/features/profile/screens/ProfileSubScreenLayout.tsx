import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { spacing } from '@/theme';

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
  const styles = useThemedStyles(buildStyles, 'features_profile_screens_ProfileSubScreenLayout_tsx_ProfileSubScreenLayout_styles');

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

function buildStyles(c: AppColors) {
  return {
  scroll: {
    minWidth: 0,
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    minWidth: 0,
    padding: spacing[4],
    gap: spacing[4],
    flexGrow: 1,
  },
  saveBlock: {
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  },
};
}
