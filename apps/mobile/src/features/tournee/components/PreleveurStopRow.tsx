import React from 'react';
import { Pressable, View } from 'react-native';
import { ChevronDown, ChevronUp, Clock, MapPin } from 'lucide-react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import { StatusBadge } from '@/components/ui/Badge';
import { TourStopRouteChip } from '@/features/tournee-nurse/components/TourStopRouteChip';
import type { PreleveurTourStop } from '@/features/tournee-preleveur/api/preleveur-tour.service';
import { formatAvailabilityDisplayFr } from '@/utils/appointment-datetime-fr';
import { useAppColors } from '@/theme/use-app-colors';
import { elevation, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

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
    <Pressable
      onPress={onPress}
      style={[styles.shell, elevation.md]}
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir la mission de ${stop.patient_name}`}
    >
      <View style={[styles.card, isNext && styles.cardNext]}>
        <Row justify="between" align="start" gap={spacing[2]}>
          <Cluster
            gap={spacing[3]}
            style={styles.cluster}
            leading={
              <View style={styles.index}>
                <AppText style={styles.indexText}>{stop.position}</AppText>
              </View>
            }
            actions={<StatusBadge status={stop.status} />}
          >
            <View style={styles.info}>
              <AppText style={styles.name} numberOfLines={1}>
                {stop.patient_name}
              </AppText>
              <Row wrap gap={spacing[1]} align="center">
                <Clock size={iconSize['2xs']} color={c.primaryDark} strokeWidth={2} />
                <AppText style={styles.time}>{timeLabel || '—'}</AppText>
                {stop.address_line ? (
                  <>
                    <View style={styles.metaDot} />
                    <MapPin size={iconSize['2xs']} color={c.textTertiary} strokeWidth={2} />
                    <AppText style={styles.address} numberOfLines={1}>
                      {stop.address_line}
                    </AppText>
                  </>
                ) : null}
              </Row>
            </View>
          </Cluster>
          {showReorder ? (
            <View style={styles.reorderCol}>
              <Pressable
                onPress={onMoveUp}
                disabled={!canMoveUp}
                style={[styles.reorderBtn, !canMoveUp && styles.reorderBtnDisabled]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Monter ${stop.patient_name}`}
              >
                <ChevronUp size={iconSize.mdSm} color={canMoveUp ? c.primary : c.textTertiary} />
              </Pressable>
              <Pressable
                onPress={onMoveDown}
                disabled={!canMoveDown}
                style={[styles.reorderBtn, !canMoveDown && styles.reorderBtnDisabled]}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Descendre ${stop.patient_name}`}
              >
                <ChevronDown size={iconSize.mdSm} color={canMoveDown ? c.primary : c.textTertiary} />
              </Pressable>
            </View>
          ) : null}
        </Row>
        {stop.position > 1 ? (
          <View style={styles.routeRow}>
            <TourStopRouteChip stop={stop} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
});

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    shell: { borderRadius: radius.xl },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: spacing[4],
      gap: spacing[2],
    },
    cardNext: { borderColor: c.primaryMid },
    cluster: { flex: 1, minWidth: 0 },
    index: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: c.primaryLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    indexText: {
      ...font.bold,
      fontSize: fontSize.base,
      color: c.primaryDark,
    },
    info: { gap: spacing[1], flex: 1, minWidth: 0 },
    name: {
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    time: {
      ...font.semiBold,
      fontSize: fontSize.xs,
      color: c.primaryDark,
    },
    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: c.textTertiary,
    },
    address: {
      minWidth: 0,
      ...font.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      flex: 1,
    },
    reorderCol: { gap: spacing[1] },
    reorderBtn: {
      width: 32,
      height: 28,
      borderRadius: radius.sm,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    reorderBtnDisabled: { opacity: 0.4 },
    routeRow: { alignItems: 'flex-end' as const },
  };
}
