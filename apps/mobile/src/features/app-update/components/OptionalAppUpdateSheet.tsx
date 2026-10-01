import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { SheetModal } from '@/components/ui/SheetModal';
import { AppText, spacing, useStyles, font, type Theme } from '@/theme';
import { getAppMeta } from '@/features/help/utils/app-meta';
import { openAppStoreUrl } from '../utils/app-update-policy';

type Props = {
  message: string;
  storeUrl: string;
  latestVersion: string;
  /** « Plus tard », glissement ou tap hors de la feuille : non reproposé pour cette version. */
  onDismiss: () => void;
};

/** Mise à jour facultative : feuille fermable, l'app reste utilisable. */
export function OptionalAppUpdateSheet({ message, storeUrl, latestVersion, onDismiss }: Props) {
  const styles = useStyles(buildStyles);
  const { appVersion } = getAppMeta();

  return (
    <SheetModal
      visible
      onClose={onDismiss}
      title="Mise à jour disponible"
      subtitle={`Version ${latestVersion} (installée : ${appVersion})`}
      footer={
        <View style={styles.actions}>
          <Button
            title="Mettre à jour"
            size="lg"
            fullWidth
            onPress={() => void openAppStoreUrl(storeUrl)}
          />
          <Button title="Plus tard" variant="ghost" size="lg" fullWidth onPress={onDismiss} />
        </View>
      }
    >
      <AppText style={styles.message}>{message}</AppText>
    </SheetModal>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    message: {
      ...font.regular,
      fontSize: fontSize.base,
      lineHeight: Math.round(fontSize.base * 1.5),
      color: c.textSecondary,
    },
    actions: {
      gap: spacing[2],
    },
  };
}
