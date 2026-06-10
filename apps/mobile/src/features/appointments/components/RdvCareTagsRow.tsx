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
import { radius, spacing } from '@/theme';
import { fontSize, lh } from '@/theme/typography';

interface Props {
  apt: Appointment;
  hideStaffOnlyCares?: boolean;
  /** `neutral` = fond gris (liste RDV) ; `brand` = primaryLight. */
  tone?: 'neutral' | 'brand';
  /** `compact` = sous le créneau dans la colonne principale. */
  density?: 'default' | 'compact';
}

function listCareTagColors(c: AppColors) {
  return {
    backgroundColor: c.surfaceAlt,
    borderColor: c.border,
  };
}

/** Soins en mini-tags (emoji + libellé). */
export function RdvCareTagsRow({
  apt,
  hideStaffOnlyCares,
  tone = 'neutral',
  density = 'default',
}: Props) {
  const colorblindType = useAppPreferencesStore((s) => s.colorblindType);
  const c = useAppColors();
  const { data: categories = [] } = useAppointmentCareCategories();
  const styles = useThemedStyles((colors) => buildStyles(colors, density));
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

  const useNeutral = tone === 'neutral';

  return (
    <View style={styles.wrap} key={colorblindType}>
      {items.map((line, idx) => {
        const tagColors = useNeutral
          ? listCareTagColors(c)
          : resolveRdvCareTagColors(line, apt.type, categories, orbColorMap);
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

function buildStyles(c: AppColors, density: 'default' | 'compact') {
  const type = buildRdvListCardTypography(c);
  const compact = density === 'compact';
  const labelSize = compact ? fontSize.xs : fontSize.sm;

  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: compact ? spacing[1] : spacing[1.5],
      alignSelf: 'stretch',
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: compact ? 3 : spacing[1],
      maxWidth: '100%',
      paddingHorizontal: compact ? spacing[1.5] : spacing[2],
      paddingVertical: compact ? spacing[0.5] : spacing[1],
      borderRadius: radius.sm,
      borderWidth: StyleSheet.hairlineWidth,
    },
    emoji: {
      fontSize: labelSize,
      lineHeight: lh(labelSize),
    },
    label: {
      fontFamily: type.careTag.fontFamily,
      fontSize: labelSize,
      lineHeight: lh(labelSize),
      color: c.textSecondary,
    },
  });
}
