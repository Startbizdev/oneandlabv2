import { ActivityIndicator, View } from 'react-native';
import { AppText, spacing, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

/** Écran d'attente des liens universels pendant la résolution (QR, droits pharmacie). */
export function DeepLinkLoadingView({ label }: { label: string }) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.root} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={c.primary} size="large" />
      <AppText variant="secondary">{label}</AppText>
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    root: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing[3],
      padding: spacing[4],
      backgroundColor: c.background,
    },
  } as const;
}
