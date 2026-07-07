import type { AppColors } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import type { PassageTourViewTab } from '@oneandlab/shared-types';
import { Pressable, StyleSheet, View } from 'react-native';
import { H_PADDING, radius, spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { layoutRow } from '@/theme/layout-styles';

const TABS: { id: PassageTourViewTab; label: string }[] = [
  { id: 'manual', label: 'Passage' },
  { id: 'intelligent', label: 'Passage intelligent' },
];

type Props = {
  active: PassageTourViewTab;
  onChange: (tab: PassageTourViewTab) => void;
};

export function TourViewTabs({ active, onChange }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);

  return (
    <View style={styles.row}>
      {TABS.map((t) => {
        const selected = active === t.id;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            style={[
              styles.tab,
              { borderColor: selected ? c.primary : c.cardBorder },
              selected && { backgroundColor: hexToRgba(c.primary, 0.1) },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <AppText
              style={[
                styles.label,
                { color: selected ? c.primaryDark : c.textSecondary },
              ]}
              numberOfLines={1}
            >
              {t.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    row: {
      ...layoutRow(spacing[2]),
      marginBottom: spacing[2],
    },
    tab: {
      minWidth: 0,
      flex: 1,
      paddingVertical: spacing[2.5],
      paddingHorizontal: spacing[2],
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: 'center' as const,
    },
    label: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      textAlign: 'center' as const,
    },
  };
}
