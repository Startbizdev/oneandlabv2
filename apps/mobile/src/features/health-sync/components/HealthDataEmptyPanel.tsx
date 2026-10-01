import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, View } from 'react-native';
import { Heart } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { radius, spacing, iconSize, AppText, useLayoutMetrics, centeredCopyMaxWidth, centeredActionMaxWidth, useStyles, font, type Theme } from '@/theme';
import { getHealthPlatformUiConfig } from '../utils/health-platform-config';

interface Props {
  connected: boolean;
  syncing?: boolean;
  onConnect: () => void;
  onRevoke?: () => void;
}

export function HealthDataEmptyPanel({
  connected,
  syncing = false,
  onConnect,
  onRevoke,
}: Props) {
  const c = useAppColors();
  const layout = useLayoutMetrics();
  const styles = useStyles(buildStyles);
  const copyMaxWidth = centeredCopyMaxWidth(layout);
  const actionMaxWidth = centeredActionMaxWidth(layout);
  const platform = getHealthPlatformUiConfig();

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconRing, { backgroundColor: c.primaryLight }]}>
        <Heart size={iconSize['3xl']} color={c.primary} fill={c.primary} strokeWidth={0} />
      </View>

      <AppText style={styles.title}>
        {connected ? 'Aucune mesure' : 'Vos données santé'}
      </AppText>

      <AppText style={[styles.description, { maxWidth: copyMaxWidth }]}>
        {connected
          ? 'Vos graphiques s’afficheront dès l’import de mesures.'
          : platform.disconnectedSubtitle}
      </AppText>

      <View style={[styles.actions, { maxWidth: actionMaxWidth }]}>
        <Button
          title={connected ? 'Synchroniser' : platform.connectTitle}
          onPress={onConnect}
          loading={syncing}
          size="lg"
          fullWidth
        />

        {connected && onRevoke ? (
          <Pressable
            onPress={onRevoke}
            accessibilityRole="button"
            accessibilityLabel="Révoquer l'accès aux données santé"
            style={({ pressed }) => [styles.revokeBtn, pressed && styles.revokeBtnPressed]}
          >
            <AppText style={styles.revoke}>Révoquer l'accès</AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    wrap: {
      alignItems: 'center' as const,
      gap: spacing[3],
      width: '100%' as const,
    },
    iconRing: {
      width: 88,
      height: 88,
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    title: {
      ...font.heading,
      fontSize: fontSize.xl,
      color: c.textPrimary,
      textAlign: 'center' as const,
      letterSpacing: -0.3,
    },
    description: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      textAlign: 'center' as const,
      lineHeight: fontSize.sm * 1.55,
    },
    actions: {
      width: '100%' as const,
      gap: spacing[3],
      marginTop: spacing[1],
    },
    revokeBtn: {
      alignSelf: 'center' as const,
      paddingVertical: spacing[2],
    },
    revokeBtnPressed: { opacity: 0.7 },
    revoke: {
      ...font.medium,
      fontSize: fontSize.sm,
      color: c.error,
    },
  };
}
