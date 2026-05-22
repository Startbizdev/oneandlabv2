import { StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  title: string;
  subtitle?: string;
  Icon: LucideIcon;
}

export function RegisterHeaderTitle({ title, subtitle, Icon }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Icon size={20} color={colors.primary} strokeWidth={2.5} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function registerHeaderTitle(
  title: string,
  subtitle: string,
  Icon: LucideIcon,
): () => React.ReactElement {
  return () => <RegisterHeaderTitle title={title} subtitle={subtitle} Icon={Icon} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    flex: 1,
    maxWidth: '100%',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.4,
  },
});
