import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { Route } from 'lucide-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
import {
  radius,
  spacing,
  iconSize,
  AppText,
  useLayoutMetrics,
  centeredCopyMaxWidth,
  centeredActionMaxWidth,
} from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { hexToRgba } from '@/theme/color-utils';

type Props = {
  date: string;
};

function dateLabel(iso: string): string {
  const today = dayjs().format('YYYY-MM-DD');
  if (iso === today) return "aujourd'hui";
  if (iso === dayjs(today).add(1, 'day').format('YYYY-MM-DD')) return 'demain';
  return `le ${dayjs(iso).format('dddd D MMMM')}`;
}

export function TourEmptyPanel({ date }: Props) {
  const c = useAppColors();
  const layout = useLayoutMetrics();
  const styles = useThemedStyles(buildStyles);
  const copyMaxWidth = centeredCopyMaxWidth(layout);
  const actionMaxWidth = centeredActionMaxWidth(layout);
  const router = useRouter();
  const label = dateLabel(date);

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.wrap}>
      <View style={[styles.iconRing, { backgroundColor: hexToRgba(c.primary, 0.1) }]}>
        <Route size={iconSize['3xl']} color={c.primary} strokeWidth={1.8} />
      </View>

      <AppText style={[styles.title, { color: c.textPrimary }]}>Journée libre</AppText>
      <AppText style={[styles.description, { color: c.textSecondary, maxWidth: copyMaxWidth }]}>
        Aucun soin planifié {label}. Parcourez le calendrier ci-dessus pour voir vos autres journées.
      </AppText>

      <View style={[styles.actions, { maxWidth: actionMaxWidth }]}>
        <Button
          title="Voir mes rendez-vous"
          onPress={() => router.push('/(nurse)/(tabs)/appointments' as never)}
          size="lg"
          fullWidth
          variant="secondary"
        />
      </View>
    </Animated.View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    wrap: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: spacing[10],
      paddingHorizontal: spacing[6],
      gap: spacing[3],
      minHeight: 360,
    },
    iconRing: {
      width: 88,
      height: 88,
      borderRadius: radius.full,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: spacing[1],
    },
    title: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xl,
      textAlign: 'center' as const,
      letterSpacing: -0.4,
    },
    description: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      textAlign: 'center' as const,
      lineHeight: fontSize.sm * 1.55,
    },
    actions: {
      width: '100%' as const,
      gap: spacing[3],
      marginTop: spacing[2],
    },
  };
}
