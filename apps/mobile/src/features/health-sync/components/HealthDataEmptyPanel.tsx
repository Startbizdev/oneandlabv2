import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, Text, View } from 'react-native';
import { Heart } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
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
  const styles = useThemedStyles(buildStyles, 'HealthDataEmptyPanel');
  const platform = getHealthPlatformUiConfig();

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconRing, { backgroundColor: c.primaryLight }]}>
        <Heart size={36} color={c.primary} fill={c.primary} strokeWidth={0} />
      </View>

      <Text style={styles.title}>
        {connected ? 'Aucune mesure' : 'Vos données santé'}
      </Text>

      <Text style={styles.description}>
        {connected
          ? 'Vos graphiques s’afficheront dès l’import de mesures.'
          : platform.disconnectedSubtitle}
      </Text>

      <View style={styles.actions}>
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
            <Text style={styles.revoke}>Révoquer l'accès</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function buildStyles(c: AppColors) {
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
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xl,
      color: c.textPrimary,
      textAlign: 'center' as const,
      letterSpacing: -0.3,
    },
    description: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      textAlign: 'center' as const,
      lineHeight: fontSize.sm * 1.55,
      maxWidth: 280,
    },
    actions: {
      width: '100%' as const,
      maxWidth: 280,
      gap: spacing[3],
      marginTop: spacing[1],
    },
    revokeBtn: {
      alignSelf: 'center' as const,
      paddingVertical: spacing[2],
    },
    revokeBtnPressed: { opacity: 0.7 },
    revoke: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.error,
    },
  };
}
