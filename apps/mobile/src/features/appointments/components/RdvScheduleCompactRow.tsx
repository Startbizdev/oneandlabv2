import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { iconSlot, flexText } from '@/theme/layout-styles';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { Row, Stack } from '@/components/layout/primitives';
import { RdvListCardCreneauRow } from '@/features/appointments/components/RdvListCardCreneauRow';
import { RdvCareTagsRow } from '@/features/appointments/components/RdvCareTagsRow';
import { MiniDateCalendar, miniDateCalendarOuterSize } from '@/components/ui/MiniDateCalendar';
import { rdvMaquetteTimeLabel } from '@/utils/rdv-maquette-card-display';
import { buildRdvListCardTypography } from '@/features/appointments/components/rdv-list-card-typography';
import { spacing } from '@/theme';
import { fontSize } from '@/theme/typography';

const CALENDAR_SIZE = 'xs' as const;
const CALENDAR_PX = miniDateCalendarOuterSize(CALENDAR_SIZE);

export type RdvScheduleDensity = 'compact' | 'relaxed';

interface RdvScheduleCompactRowProps {
  apt: Appointment;
  creneauLabel?: string;
  /** Texte soin si RdvCareTagsRow ne produit rien (historique ordonnance). */
  careLabel?: string;
  status?: string;
  trailing?: ReactNode;
  density?: RdvScheduleDensity;
  hideStaffOnlyCares?: boolean;
}

function useRdvScheduleStyles(density: RdvScheduleDensity) {
  const compact = useThemedStyles(buildRdvScheduleCompactStyles, 'RdvScheduleCompactRow.compact');
  const relaxed = useThemedStyles(buildRdvScheduleRelaxedStyles, 'RdvScheduleCompactRow.relaxed');
  return density === 'relaxed' ? relaxed : compact;
}

/** Ligne RDV compacte — source unique (liste, historique, détail). */
export function RdvScheduleCompactRow({
  apt,
  creneauLabel,
  careLabel,
  status: statusProp,
  trailing,
  density = 'compact',
  hideStaffOnlyCares = false,
}: RdvScheduleCompactRowProps) {
  const styles = useRdvScheduleStyles(density);
  const creneau = (creneauLabel ?? rdvMaquetteTimeLabel(apt)).trim();
  const status = statusProp ?? String(apt.status ?? '');
  const rowGap = density === 'relaxed' ? spacing[3] : spacing[2.5];
  const mainColGap = density === 'relaxed' ? spacing[2] : spacing[1.5];

  return (
    <Row gap={rowGap} align="start" style={styles.root}>
      <Row gap={rowGap} align="start" flex={1} style={styles.scheduleRow}>
        <View style={styles.calendarSlot}>
          <MiniDateCalendar
            date={apt.scheduled_at}
            size={CALENDAR_SIZE}
            variant="brand"
            accessibilityHidden
          />
        </View>
        <Stack gap={mainColGap} flex={1} style={styles.mainCol}>
          <RdvListCardCreneauRow label={creneau} status={status} />
          {careLabel ? (
            <Text style={styles.careFallback} numberOfLines={1}>
              {careLabel}
            </Text>
          ) : (
            <RdvCareTagsRow
              apt={apt}
              hideStaffOnlyCares={hideStaffOnlyCares}
              tone="neutral"
              density="compact"
            />
          )}
        </Stack>
      </Row>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Row>
  );
}

export { CALENDAR_PX as rdvScheduleCalendarPx };

function buildRdvScheduleCompactStyles(c: AppColors) {
  const type = buildRdvListCardTypography(c);
  return {
    root: {
      alignSelf: 'stretch' as const,
    },
    scheduleRow: {
      minWidth: 0,
    },
    calendarSlot: iconSlot(CALENDAR_PX),
    mainCol: {
      ...flexText,
    },
    careFallback: {
      ...type.meta,
      color: c.textSecondary,
      fontSize: fontSize.xs,
    },
    trailing: {
      flexShrink: 0,
      paddingTop: spacing[0.5],
    },
  };
}

function buildRdvScheduleRelaxedStyles(c: AppColors) {
  const compact = buildRdvScheduleCompactStyles(c);
  return {
    ...compact,
    trailing: {
      flexShrink: 0,
      paddingTop: spacing[1],
      paddingLeft: spacing[0.5],
    },
  };
}
