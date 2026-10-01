import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSceneBottomInset } from '@/navigation/use-scene-bottom-inset';
import { Button } from '@/components/ui/Button';
import { FormScreen, FORM_ACTION_BAR_HEIGHT } from '@/components/layout/FormScreen';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { UnsavedChangesGuard } from '@/features/profile/components/UnsavedChangesGuard';
import { spacing, useStyles, type Theme } from '@/theme';

interface Props {
  children: ReactNode;
  saveTitle?: string;
  onSave?: () => void;
  saving?: boolean;
  hideSave?: boolean;
  /**
   * Modifications non enregistrées. Renseigné : « Enregistrer » n'est actif qu'en cas de modification
   * et quitter l'écran demande confirmation.
   */
  dirty?: boolean;
  /** Empêche l'enregistrement (ex. données serveur pas encore chargées). */
  saveDisabled?: boolean;
  /** Sheets et modales rendues hors du scroll. */
  overlay?: ReactNode;
}

/** Écran secondaire profil : formulaire scrollable, « Enregistrer » collé en bas. */
export function ProfileSubScreenLayout({
  children,
  saveTitle = 'Enregistrer',
  onSave,
  saving,
  hideSave,
  dirty,
  saveDisabled,
  overlay,
}: Props) {
  const styles = useStyles(buildStyles);
  const { footerPadding: bottomInset } = useSceneBottomInset();
  const showSave = !hideSave && !!onSave;
  const tracksChanges = dirty !== undefined;

  return (
    <StackChromeScreen>
      <FormScreen
        contentContainerStyle={[styles.content, !showSave && { paddingBottom: bottomInset + spacing[4] }]}
        keyboardShouldPersistTaps="handled"
        footer={
          showSave ? (
            <View style={[styles.saveBar, { paddingBottom: bottomInset }]}>
              <Button
                title={saveTitle}
                loading={saving}
                disabled={saveDisabled || (tracksChanges && !dirty)}
                onPress={onSave}
                fullWidth
                size="lg"
              />
            </View>
          ) : undefined
        }
      >
        {children}
      </FormScreen>
      {overlay}
      {tracksChanges ? <UnsavedChangesGuard dirty={!!dirty && !saving} /> : null}
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    content: {
      minWidth: 0,
      padding: spacing[4],
      gap: spacing[4],
      flexGrow: 1,
    },
    saveBar: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[3],
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
    },
  };
}
