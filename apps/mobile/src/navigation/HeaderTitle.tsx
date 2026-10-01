import { Platform, View } from 'react-native';
import { AppText, useStyles, font, type Theme } from '@/theme';

interface HeaderTitleProps {
  title: string;
}

/** Titre header — texte seul (sans icône). */
export function HeaderTitleText({ title }: HeaderTitleProps) {
  const styles = useStyles(buildStyles);

  return (
    <View style={styles.wrap}>
      <AppText style={styles.title} numberOfLines={1}>
        {title}
      </AppText>
    </View>
  );
}

function buildStyles({ colors: c, fontSize, scale }: Theme) {
  return {
    wrap: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center' as const,
    },
    title: {
      ...font.heading,
      fontSize: Platform.select({ ios: fontSize.xl, default: fontSize.lg }),
      lineHeight: Platform.select({ ios: scale(28), default: fontSize.lg * 1.2 }),
      color: c.textPrimary,
      letterSpacing: Platform.select({ ios: -0.4, default: -0.3 }),
      flexShrink: 1,
      minWidth: 0,
    },
  };
}
