import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { LinearGradient } from 'expo-linear-gradient';
import type { LucideIcon } from 'lucide-react-native';
import {
  APP_HEADER_TITLE_ICON_SIZE,
  APP_HEADER_ORB_STROKE,
} from '@/components/navigation/header-layout';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export const HEADER_TAB_ICON_SIZE = APP_HEADER_TITLE_ICON_SIZE;
export const HEADER_TAB_ICON_STROKE = APP_HEADER_ORB_STROKE;

interface HeaderTitleProps {
  title: string;
  Icon: LucideIcon;
  tintColor?: string;
}

export function HeaderTitleWithIcon({ title, Icon }: HeaderTitleProps) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'navigation_HeaderTitle_tsx_HeaderTitleWithIcon_styles');

  return (
    <Cluster
      gap={spacing[2.5]}
      leading={
        <LinearGradient
          colors={[c.gradientStart, c.gradientEnd]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.iconChip}
        >
          <Icon
            size={HEADER_TAB_ICON_SIZE}
            color={c.textInverse}
            strokeWidth={HEADER_TAB_ICON_STROKE}
          />
        </LinearGradient>
      }
      style={styles.row}
    >
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
    </Cluster>
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

function buildStyles(c: AppColors) {
  return {
  row: {
    maxWidth: '100%' as const,
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: c.textPrimary,
    letterSpacing: -0.3,
    flexShrink: 1,
    minWidth: 0,
  },
};
}
