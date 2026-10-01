import { View } from 'react-native';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  title: string;
  items: string[];
  tone?: 'default' | 'warning';
}

/** Liste courte de conséquences affichée avant une suppression de compte. */
export function DeleteAccountInfoCard({ title, items, tone = 'default' }: Props) {
  const styles = useStyles(buildStyles);
  return (
    <View style={[styles.card, tone === 'warning' && styles.cardWarning]}>
      <AppText style={styles.title} accessibilityRole="header">
        {title}
      </AppText>
      {items.map((item) => (
        <View key={item} style={styles.item}>
          <AppText style={styles.bullet}>•</AppText>
          <AppText style={styles.text}>{item}</AppText>
        </View>
      ))}
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: spacing[4],
      gap: spacing[2],
    },
    cardWarning: {
      backgroundColor: c.warningLight,
      borderColor: c.warningLight,
    },
    title: {
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    item: {
      flexDirection: 'row' as const,
      gap: spacing[2],
    },
    bullet: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    text: {
      ...font.regular,
      flex: 1,
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.45,
      color: c.textSecondary,
    },
  };
}
