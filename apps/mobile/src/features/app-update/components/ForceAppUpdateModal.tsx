import { useAppColors } from '@/theme/use-app-colors';
import { Modal, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { elevation, hexToRgba, palette, radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';
import { getAppMeta } from '@/features/help/utils/app-meta';
import { openAppStoreUrl } from '../utils/app-update-policy';

type Props = {
  message: string;
  storeUrl: string;
  latestVersion: string;
};

/** Mise à jour obligatoire : bloque l'app tant que la version installée est trop ancienne. */
export function ForceAppUpdateModal({ message, storeUrl, latestVersion }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const { appVersion } = getAppMeta();

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View style={styles.backdrop}>
        <View style={[styles.card, elevation.lg, { backgroundColor: c.surface }]}>
          <AppText style={[styles.title, { color: c.textPrimary }]}>Mise à jour requise</AppText>
          <AppText style={[styles.sub, { color: c.textSecondary }]}>{message}</AppText>
          <AppText style={[styles.meta, { color: c.textSecondary }]}>
            Version installée : {appVersion} · Nouvelle version : {latestVersion}
          </AppText>
          <View style={styles.actions}>
            <Button title="Mettre à jour" onPress={() => void openAppStoreUrl(storeUrl)} fullWidth />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function buildStyles({ fontSize }: Theme) {
  return {
    backdrop: {
      minWidth: 0,
      flex: 1,
      backgroundColor: hexToRgba(palette.slate[900], 0.45),
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: spacing[6],
    },
    card: {
      minWidth: 0,
      width: '100%' as const,
      maxWidth: 360,
      borderRadius: radius['2xl'],
      padding: spacing[5],
      gap: spacing[3],
    },
    title: {
      ...font.heading,
      fontSize: fontSize.lg,
      textAlign: 'center' as const,
    },
    sub: {
      ...font.regular,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.45,
      textAlign: 'center' as const,
    },
    meta: {
      ...font.regular,
      fontSize: fontSize.xs,
      textAlign: 'center' as const,
    },
    actions: { marginTop: spacing[1], gap: spacing[3] },
  };
}
