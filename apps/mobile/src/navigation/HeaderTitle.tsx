import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** Même taille / trait que les icônes actives de la tab bar. */
export const HEADER_TAB_ICON_SIZE = 22;
export const HEADER_TAB_ICON_STROKE = 2.5;

interface HeaderTitleProps {
  title: string;
  Icon: LucideIcon;
  tintColor?: string;
}

export function HeaderTitleWithIcon({ title, Icon, tintColor }: HeaderTitleProps) {
  const iconColor = tintColor ?? colors.primary;

  return (
    <View style={styles.row}>
      <Icon
        size={HEADER_TAB_ICON_SIZE}
        color={iconColor}
        strokeWidth={HEADER_TAB_ICON_STROKE}
      />
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

/** Titre header onglet : icône Lucide identique à la tab bar + libellé à gauche. */
export function tabHeaderTitle(
  title: string,
  Icon: LucideIcon,
): (props: { tintColor?: string }) => ReactElement {
  return ({ tintColor }) => (
    <HeaderTitleWithIcon title={title} Icon={Icon} tintColor={tintColor} />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    maxWidth: '100%',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
});
