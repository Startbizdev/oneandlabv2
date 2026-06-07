import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { useAppointmentCareCategories } from '@/features/appointments/detail/hooks/use-appointment-care-categories';
import {
  buildCareTileOrbColorMap,
  resolveRdvCareTagColors,
} from '@/features/appointments/form/utils/booking-care-catalog';
import { useAppPreferencesStore } from '@/store/app-preferences-store';
import { rdvCatalogDisplayLines, type RdvCatalogDisplayOpts } from '@/utils/rdv-catalog-lines';
import { buildRdvListCardTypography } from './rdv-list-card-typography';
import { radius } from '@/theme';

interface Props {
  apt: Appointment;
  /** Vue patient : masque certificat de décès et actes staff-only. */
  hideStaffOnlyCares?: boolean;
}

/** Soins en mini-tags colorés par acte (emoji + libellé). */
export function RdvCareTagsRow({ apt, hideStaffOnlyCares }: Props) {
  const colorblindType = useAppPreferencesStore((s) => s.colorblindType);
  useAppColors();
  const { data: categories = [] } = useAppointmentCareCategories();
  const styles = useThemedStyles(buildStyles);
  const orbColorMap = useMemo(
    () => buildCareTileOrbColorMap(categories),
    [categories, colorblindType],
  );

  const opts: RdvCatalogDisplayOpts | undefined = hideStaffOnlyCares
    ? { hideStaffOnlyCares: true }
    : undefined;
  const lines = rdvCatalogDisplayLines(apt, opts);
  if (!lines.length) return null;

  const seen = new Set<string>();
  const items = lines.filter((line) => {
    const key = line.label.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (!items.length) return null;

  return (
    <View style={styles.wrap} key={colorblindType}>
      {items.map((line, idx) => {
        const tagColors = resolveRdvCareTagColors(line, apt.type, categories, orbColorMap);
        return (
          <View
            key={`${line.category_id ?? 'noid'}-${idx}-${line.label}`}
            style={[
              styles.tag,
              {
                backgroundColor: tagColors.backgroundColor,
                borderColor: tagColors.borderColor,
              },
            ]}
          >
            <Text style={styles.emoji} accessibilityElementsHidden>
              {line.emoji}
            </Text>
            <Text style={styles.label} numberOfLines={1}>
              {line.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function buildStyles(c: AppColors) {
  const type = buildRdvListCardTypography(c);
  return {
    wrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'stretch',
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      maxWidth: '100%',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
    },
    emoji: type.careEmoji,
    label: type.careTag,
  };
}
