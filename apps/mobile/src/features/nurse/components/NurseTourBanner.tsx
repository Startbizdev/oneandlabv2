import { layoutRowCenter } from '@/theme/layout-styles';
import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Route } from 'lucide-react-native';
import { elevation, radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type Props = {
  stopCount?: number;
};

/** Bandeau CTA « Ma tournée » sur la liste RDV acceptés. */
export function NurseTourBanner({ stopCount }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push('/(nurse)/tournee' as never)}
      style={[styles.card, elevation.sm, { backgroundColor: c.surface, borderColor: c.borderLight }]}
      accessibilityRole="button"
      accessibilityLabel="Ouvrir ma tournée"
    >
      <View style={[styles.iconWrap, { backgroundColor: c.primaryLight }]}>
        <Route size={iconSize.mdSm} color={c.primary} strokeWidth={2} />
      </View>
      <View style={styles.body}>
        <AppText style={[styles.title, { color: c.textPrimary }]}>Ma tournée</AppText>
        <AppText style={[styles.sub, { color: c.textSecondary }]}>
          {typeof stopCount === 'number' && stopCount > 0
            ? `${stopCount} passage${stopCount > 1 ? 's' : ''} · ordre intelligent`
            : 'Organiser vos passages du jour'}
        </AppText>
      </View>
      <ChevronRight size={iconSize.md} color={c.textTertiary} />
    </Pressable>
  );
}

function buildStyles(_c: AppColors) {
  return {
    card: {
      ...layoutRowCenter(spacing[3]),
      borderRadius: radius.xl,
      borderWidth: 1,
      padding: spacing[3],
      marginBottom: spacing[3],
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    body: {
    minWidth: 0, flex: 1, gap: spacing[0.5] },
    title: { fontFamily: fontFamily.bold, fontSize: fontSize.sm },
    sub: { fontFamily: fontFamily.regular, fontSize: fontSize.xs },
  };
}
