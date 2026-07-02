import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Stack } from '@/components/layout/primitives';
import { RdvCareTagsRow } from '@/features/appointments/components/RdvCareTagsRow';
import { useAppointmentCareCategories } from '@/features/appointments/detail/hooks/use-appointment-care-categories';
import {
  buildAppointmentCareOptionKvRows,
  getAppointmentNursingItems,
  nursingItemDisplayLabel,
} from '@/utils/appointment-detail-display';
import { isNursingAppointment } from '@oneandlab/shared-utils';
import type { NurseTourStop } from '../api/nurse-tour.service';
import {
  tourStopAsAppointment,
  tourStopLotSummaryLabel,
} from '../utils/tour-stop-as-appointment';
import { spacing } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';

type Props = {
  stop: NurseTourStop;
  /** Directement sous le nom patient — marges resserrées */
  embedded?: boolean;
  /** Passage terminé — contenu atténué */
  muted?: boolean;
  /** Liste tournée : soins uniquement (sans Type / options détail). */
  listCompact?: boolean;
};

function isDetailOptionLabel(label: string): boolean {
  const normalized = label.trim().toLowerCase();
  return (
    normalized === 'type' ||
    normalized === 'type de soin' ||
    normalized === 'localisation' ||
    normalized.includes('plaie')
  );
}

/** Soins (emoji + libellé), options catalogue et mention lot — aligné détail RDV. */
export function TourStopCareSection({ stop, embedded = false, muted = false, listCompact = false }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const apt = useMemo(() => tourStopAsAppointment(stop), [stop]);
  const { data: categories = [] } = useAppointmentCareCategories();
  const lotLabel = tourStopLotSummaryLabel(stop);

  const optionRows = useMemo(
    () => buildAppointmentCareOptionKvRows(apt, categories).filter((r) => r.value?.trim()),
    [apt, categories],
  );

  const displayOptionRows = useMemo(() => {
    const baseRows = listCompact
      ? optionRows.filter((row) => !isDetailOptionLabel(row.label))
      : optionRows;

    if (listCompact) return baseRows;

    if (baseRows.some((row) => isDetailOptionLabel(row.label))) {
      return baseRows;
    }
    if (!isNursingAppointment(apt.type)) return baseRows;
    const items = getAppointmentNursingItems(apt);
    if (items.length > 1) return baseRows;
    const value =
      items.length === 1 ? nursingItemDisplayLabel(items[0]!) : apt.category_name?.trim() ?? '';
    if (!value) return baseRows;
    return [{ label: 'Type', value }, ...baseRows];
  }, [apt, listCompact, optionRows]);

  return (
    <Stack
      gap={spacing[1]}
      style={[styles.wrap, embedded && styles.wrapEmbedded, muted && styles.wrapMuted]}
    >
      {lotLabel ? (
        <Text style={styles.lotLabel} numberOfLines={1}>
          {lotLabel}
        </Text>
      ) : null}
      <RdvCareTagsRow apt={apt} tone="neutral" density="compact" badgeCategoryOnly />
      {displayOptionRows.length > 0 ? (
        <View style={styles.optionsBlock}>
          {displayOptionRows.map((row) => {
            const line = (
              <Text style={styles.optionLine} numberOfLines={2}>
                <Text style={styles.optionLabel}>{row.label} : </Text>
                {row.value}
              </Text>
            );
            return <View key={`${row.label}-${row.value}`}>{line}</View>;
          })}
        </View>
      ) : null}
    </Stack>
  );
}

function buildStyles(c: AppColors) {
  return {
    wrap: {
      marginTop: spacing[1.5],
      minWidth: 0,
      alignSelf: 'stretch' as const,
    },
    wrapEmbedded: {
      marginTop: spacing[1],
    },
    wrapMuted: {
      opacity: 0.62,
    },
    lotLabel: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs),
      color: c.textSecondary,
      letterSpacing: 0.2,
    },
    optionsBlock: {
      gap: spacing[0.5],
      minWidth: 0,
    },
    optionLine: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs),
      color: c.textSecondary,
    },
    optionLabel: {
      fontFamily: fontFamily.medium,
      color: c.textTertiary,
    },
    metaRow: {
      marginTop: spacing[0.5],
      minWidth: 0,
      alignSelf: 'stretch' as const,
    },
    metaIconWrap: {
      width: 18,
      alignItems: 'center' as const,
      flexShrink: 0,
    },
    metaLine: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
    },
  };
}
