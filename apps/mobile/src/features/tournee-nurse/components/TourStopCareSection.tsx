import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Stack } from '@/components/layout/primitives';
import { RdvCareTagsRow } from '@/features/appointments/components/RdvCareTagsRow';
import { useAppointmentCareCategories } from '@/features/appointments/detail/hooks/use-appointment-care-categories';
import { buildAppointmentCareOptionKvRows } from '@/utils/appointment-detail-display';
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
};

/** Soins (emoji + libellé), options catalogue et mention lot — aligné détail RDV. */
export function TourStopCareSection({ stop, embedded = false, muted = false }: Props) {
  const styles = useThemedStyles(buildStyles);
  const apt = useMemo(() => tourStopAsAppointment(stop), [stop]);
  const { data: categories = [] } = useAppointmentCareCategories();
  const lotLabel = tourStopLotSummaryLabel(stop);

  const optionRows = useMemo(
    () => buildAppointmentCareOptionKvRows(apt, categories).filter((r) => r.value?.trim()),
    [apt, categories],
  );

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
      <RdvCareTagsRow apt={apt} tone="neutral" density="compact" />
      {optionRows.length > 0 ? (
        <View style={styles.optionsBlock}>
          {optionRows.map((row) => (
            <Text key={`${row.label}-${row.value}`} style={styles.optionLine} numberOfLines={2}>
              <Text style={styles.optionLabel}>{row.label} : </Text>
              {row.value}
            </Text>
          ))}
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
  };
}
