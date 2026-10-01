import { layoutRowCenter } from '@/theme/layout-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Route } from 'lucide-react-native';
import { elevation, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

type Props = {
  /** Passages restants aujourd'hui (non effectués, hors absents) ; absent tant que la tournée n'est pas chargée. */
  remainingToday?: number;
};

function bannerSubtitle(remainingToday: number | undefined): string {
  if (remainingToday === undefined) return 'Organiser vos passages du jour';
  if (remainingToday === 0) return 'Aucun passage restant aujourd’hui';
  return `${remainingToday} passage${remainingToday > 1 ? 's' : ''} restant${remainingToday > 1 ? 's' : ''} aujourd’hui`;
}

/** Bandeau d'accès à la tournée quand aucun prochain passage n'est à afficher. */
export function NurseTourBanner({ remainingToday }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
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
        <AppText style={[styles.sub, { color: c.textSecondary }]}>{bannerSubtitle(remainingToday)}</AppText>
      </View>
      <ChevronRight size={iconSize.md} color={c.textTertiary} />
    </Pressable>
  );
}

function buildStyles({ fontSize }: Theme) {
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
    body: { minWidth: 0, flex: 1, gap: spacing[0.5] },
    title: { ...font.bold, fontSize: fontSize.sm },
    sub: { ...font.regular, fontSize: fontSize.xs },
  };
}
