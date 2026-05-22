import { StyleSheet, Text, View } from 'react-native';
import { ContactActionBar, type ContactAction } from './ContactActionBar';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  title?: string;
  name: string;
  subtitle?: string;
  detail?: string;
  actions?: ContactAction[];
}

export function DetailPersonBlock({ title, name, subtitle, detail, actions }: Props) {
  return (
    <View style={styles.wrap}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <Text style={styles.name}>{name}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      {actions && actions.length > 0 ? <ContactActionBar actions={actions} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[2],
    paddingVertical: spacing[1],
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  name: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  sub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detail: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.45,
  },
});
