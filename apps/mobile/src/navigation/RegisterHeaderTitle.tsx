import { useAppColors } from '@/theme/use-app-colors';

import { StyleSheet, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import type { LucideIcon } from 'lucide-react-native';
import { radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  title: string;
  subtitle?: string;
  Icon: LucideIcon;
}

export function RegisterHeaderTitle({
  title, subtitle, Icon }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  return (
    <Cluster
      gap={spacing[3]}
      leading={
        <View style={styles.iconWrap}>
          <Icon size={iconSize.md} color={c.primary} strokeWidth={2.5} />
        </View>
      }
      style={styles.row}
    >
      <View style={styles.textCol}>
        <AppText style={styles.title} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </Cluster>
  );
}

export function registerHeaderTitle(
  title: string,
  subtitle: string,
  Icon: LucideIcon,
): () => React.ReactElement {
  return () => <RegisterHeaderTitle title={title} subtitle={subtitle} Icon={Icon} />;
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  row: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%' as const,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  textCol: {
    gap: 2,
  },
  title: {
    ...font.heading,
    fontSize: fontSize.lg,
    color: c.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    ...font.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    lineHeight: fontSize.xs * 1.4,
  },
};
}

