import { Image, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ILLUSTRATIONS } from '@/constants/illustrations';
import { spacing, AppText, useLayoutMetrics, responsiveValue, useStyles } from '@/theme';
import { getHealthPlatformUiConfig } from '../utils/health-platform-config';

interface Props {
  syncing?: boolean;
  /** Seul déclencheur de la demande d’autorisation système (jamais au montage). */
  onConnect: () => void;
}

export function HealthConnectOnboarding({ syncing = false, onConnect }: Props) {
  const layout = useLayoutMetrics();
  const styles = useStyles(buildStyles);
  const illustrationSize = responsiveValue(layout, { compact: 136, default: 160, wide: 184 });
  const platform = getHealthPlatformUiConfig();

  return (
    <View style={styles.wrap}>
      <Image
        source={ILLUSTRATIONS['health-record']}
        style={{ width: illustrationSize, height: illustrationSize }}
        resizeMode="contain"
        accessible={false}
      />
      <View style={styles.copy}>
        <AppText variant="headline" style={styles.centered} accessibilityRole="header">
          Vos mesures dans Cary
        </AppText>
        <AppText variant="secondary" style={styles.centered}>
          Vos pas, votre activité, votre fréquence cardiaque et votre poids au même endroit.
        </AppText>
      </View>

      <Button
        title={platform.connectTitle}
        size="lg"
        fullWidth
        loading={syncing}
        onPress={onConnect}
        accessibilityHint={`Ouvre la demande d’autorisation ${platform.name}`}
      />

      <AppText variant="caption" style={styles.centered}>
        Lecture seule : Cary n’écrit rien dans {platform.name}.
      </AppText>
    </View>
  );
}

function buildStyles() {
  return {
    wrap: {
      width: '100%' as const,
      alignItems: 'center' as const,
      gap: spacing[4],
      paddingTop: spacing[4],
    },
    copy: { width: '100%' as const, gap: spacing[2] },
    centered: { textAlign: 'center' as const },
  };
}
