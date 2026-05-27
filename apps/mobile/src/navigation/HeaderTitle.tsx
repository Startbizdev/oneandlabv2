import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import {
  APP_HEADER_TITLE_ICON_SIZE,
  APP_HEADER_ORB_STROKE,
} from '@/components/navigation/header-layout';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export const HEADER_TAB_ICON_SIZE = APP_HEADER_TITLE_ICON_SIZE;
export const HEADER_TAB_ICON_STROKE = APP_HEADER_ORB_STROKE;

interface HeaderTitleProps {
  title: string;
  Icon: LucideIcon;
  tintColor?: string;
}

export function HeaderTitleWithIcon({ title, Icon }: HeaderTitleProps) {
  return (
    <View style={styles.row}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.iconChip}
      >
        <Icon
          size={HEADER_TAB_ICON_SIZE}
          color={colors.textInverse}
          strokeWidth={HEADER_TAB_ICON_STROKE}
        />
      </LinearGradient>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

/** Titre header onglet — icône compacte + libellé lisible. */
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
    gap: spacing[2.5],
    maxWidth: '100%',
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
});
