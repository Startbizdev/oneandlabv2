import React from 'react';
import { Pressable, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { StatusBadge } from '@/components/ui/Badge';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { TourStopRouteChip } from '@/features/tournee-nurse/components/TourStopRouteChip';
import type { PreleveurTourStop } from '@/features/tournee-preleveur/api/preleveur-tour.service';
import { formatAvailabilityDisplayFr } from '@/utils/appointment-datetime-fr';
import { useAppColors } from '@/theme/use-app-colors';
import { ICON_STROKE_WIDTH, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  stop: PreleveurTourStop;
  isNext: boolean;
  showReorder: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onPress: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const INDEX_SIZE = spacing[8];

export const PreleveurStopRow = React.memo(function PreleveurStopRow({
  stop,
  isNext,
  showReorder,
  canMoveUp,
  canMoveDown,
  onPress,
  onMoveUp,
  onMoveDown,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const timeLabel = formatAvailabilityDisplayFr(stop.availability, stop.scheduled_at);

  return (
    <View style={[styles.card, isNext && styles.cardNext]}>
      <Row align="start" gap={spacing[3]}>
        <Pressable
          onPress={onPress}
          style={styles.main}
          accessibilityRole="button"
          accessibilityLabel={`Arrêt ${stop.position}, ${stop.patient_name}${timeLabel ? `, ${timeLabel}` : ''}`}
        >
          <Row align="start" gap={spacing[3]}>
            <View style={styles.index}>
              <AppText compact style={styles.indexText}>
                {stop.position}
              </AppText>
            </View>
            <View style={styles.info}>
              <Row justify="between" align="start" gap={spacing[2]}>
                <AppText variant="body" style={styles.name}>
                  {stop.patient_name}
                </AppText>
                <StatusBadge status={stop.status} />
              </Row>
              {timeLabel ? <AppText variant="secondary">{timeLabel}</AppText> : null}
              {stop.address_line ? <AppText variant="caption">{stop.address_line}</AppText> : null}
            </View>
          </Row>
        </Pressable>
        {showReorder ? (
          <View style={styles.reorderCol}>
            <IconActionButton
              label={`Monter ${stop.patient_name}`}
              onPress={onMoveUp}
              disabled={!canMoveUp}
              variant="muted"
            >
              <ChevronUp size={iconSize.md} color={c.textPrimary} strokeWidth={ICON_STROKE_WIDTH} />
            </IconActionButton>
            <IconActionButton
              label={`Descendre ${stop.patient_name}`}
              onPress={onMoveDown}
              disabled={!canMoveDown}
              variant="muted"
            >
              <ChevronDown size={iconSize.md} color={c.textPrimary} strokeWidth={ICON_STROKE_WIDTH} />
            </IconActionButton>
          </View>
        ) : null}
      </Row>
      {stop.position > 1 ? (
        <View style={styles.routeRow}>
          <TourStopRouteChip stop={stop} />
        </View>
      ) : null}
    </View>
  );
});

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: spacing[4],
      gap: spacing[2],
    },
    cardNext: { borderColor: c.primaryMid },
    main: { flex: 1, minWidth: 0 },
    index: {
      width: INDEX_SIZE,
      height: INDEX_SIZE,
      borderRadius: radius.full,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    indexText: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    info: { gap: spacing[0.5], flex: 1, minWidth: 0 },
    name: {
      ...font.semiBold,
      flexShrink: 1,
      minWidth: 0,
    },
    reorderCol: { gap: spacing[2] },
    routeRow: { alignItems: 'flex-end' as const },
  };
}
