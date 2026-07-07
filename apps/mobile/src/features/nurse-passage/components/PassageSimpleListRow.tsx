import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Check, ChevronDown, ChevronUp, Car, Clock, Route, UserX } from 'lucide-react-native';
import { isTourStopAbsent } from '@oneandlab/shared-utils';
import { Cluster, Row } from '@/components/layout/primitives';
import { Badge } from '@/components/ui/Badge';
import { TourStopCareSection } from '@/features/tournee-nurse/components/TourStopCareSection';
import type { NurseTourStop } from '@/features/tournee-nurse/api/nurse-tour.service';
import { getAppointmentListCardStyles } from '@/utils/appointment-list-card-styles';
import {
  formatPassageDurationLabel,
  formatPassageTimeLabel,
  resolvePassageRouteListLabels,
} from '../utils/passage-display';
import { spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { hexToRgba } from '@/theme/color-utils';

type Props = {
  stop: NurseTourStop;
  index: number;
  total: number;
  isNext?: boolean;
  onPressName: () => void;
  onToggleDone: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onManageAbsence?: () => void;
};

export function PassageSimpleListRow({
  stop,
  index,
  total,
  isNext = false,
  onPressName,
  onToggleDone,
  onMoveUp,
  onMoveDown,
  onManageAbsence,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const cardStyles = getAppointmentListCardStyles();
  const absent = isTourStopAbsent(stop);
  const done = !absent && (stop.visit_status === 'done' || stop.status === 'completed');
  const absenceLabel = stop.patient_absence?.card_label_fr;
  const timeLabel = formatPassageTimeLabel(stop);
  const durationLabel = formatPassageDurationLabel(stop);
  const { kmLabel, driveMinLabel } = resolvePassageRouteListLabels(stop, index);
  const scheduleMeta = [timeLabel, durationLabel].filter(Boolean).join(' · ');

  return (
    <Animated.View entering={FadeInDown.delay(index * 35).duration(280)} style={cardStyles.cardShell}>
      <View
        style={[
          cardStyles.card,
          styles.cardInner,
          absent && styles.cardAbsent,
          {
            backgroundColor: absent
              ? hexToRgba(c.textTertiary, 0.08)
              : done
                ? hexToRgba(c.success, 0.1)
                : c.surface,
            borderColor: absent
              ? hexToRgba(c.textTertiary, 0.22)
              : done
                ? hexToRgba(c.success, 0.28)
                : c.borderLight,
            opacity: absent ? 0.72 : 1,
          },
        ]}
      >
        <Cluster
          align="center"
          gap={spacing[2.5]}
          actions={
            <Pressable
              onPress={absent ? onManageAbsence : onToggleDone}
              disabled={absent && !onManageAbsence}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.checkHit}
              accessibilityRole={absent ? 'button' : 'checkbox'}
              accessibilityState={absent ? undefined : { checked: done }}
              accessibilityLabel={
                absent
                  ? 'Gérer l\'absence du patient'
                  : done
                    ? 'Passage effectué, appuyer pour annuler'
                    : 'Marquer comme effectué'
              }
            >
              <View
                style={[
                  styles.checkOuter,
                  absent
                    ? {
                        borderColor: hexToRgba(c.textTertiary, 0.35),
                        backgroundColor: hexToRgba(c.textTertiary, 0.12),
                      }
                    : done
                      ? {
                          borderColor: c.success,
                          backgroundColor: c.success,
                        }
                      : {
                          borderColor: hexToRgba(c.textTertiary, 0.35),
                          backgroundColor: c.surfaceAlt,
                        },
                ]}
              >
                {absent ? (
                  <UserX size={iconSize.smMd} color={c.textTertiary} strokeWidth={2.3} />
                ) : (
                  <Check
                    size={iconSize.mdSm}
                    color={done ? '#FFFFFF' : c.textTertiary}
                    strokeWidth={2.5}
                    opacity={done ? 1 : 0.38}
                  />
                )}
              </View>
            </Pressable>
          }
        >
          <Pressable
            onPress={onPressName}
            onLongPress={onManageAbsence}
            style={styles.nameCol}
            accessibilityRole="button"
            accessibilityLabel={`Ouvrir le passage de ${stop.patient_name}`}
          >
            <Row gap={spacing[1.5]} align="center" wrap style={styles.nameRow}>
              <AppText
                style={[styles.name, styles.nameFlex, { color: done ? c.textSecondary : c.textPrimary }]}
                numberOfLines={1}
              >
                {stop.patient_name}
              </AppText>
              {isNext && !done && !absent ? (
                <Badge label="Suivant" variant="primary" size="sm" dot={false} />
              ) : null}
              {absent && absenceLabel ? (
                <Badge label={absenceLabel} variant="neutral" size="sm" dot={false} />
              ) : null}
            </Row>
            <TourStopCareSection stop={stop} embedded listCompact muted={done || absent} />
            {scheduleMeta ? (
              <Row gap={spacing[2]} align="center" style={styles.metaRow}>
                <View style={styles.metaIconWrap}>
                  <Clock size={iconSize['2xs']} color={c.textTertiary} strokeWidth={2.5} />
                </View>
                <AppText style={[styles.meta, { color: c.textTertiary }]}>{scheduleMeta}</AppText>
              </Row>
            ) : null}
            {kmLabel || driveMinLabel ? (
              <Row gap={spacing[2.5]} align="center" wrap style={styles.metaRow}>
                {kmLabel ? (
                  <Row gap={spacing[1]} align="center" style={styles.routeSegment}>
                    <Route size={iconSize['2xs']} color={c.textTertiary} strokeWidth={2.5} />
                    <AppText style={[styles.metaInline, { color: c.textTertiary }]}>{kmLabel}</AppText>
                  </Row>
                ) : null}
                {driveMinLabel ? (
                  <Row gap={spacing[1]} align="center" style={styles.routeSegment}>
                    <Car size={iconSize['2xs']} color={c.textTertiary} strokeWidth={2.5} />
                    <AppText style={[styles.metaInline, { color: c.textTertiary }]}>{driveMinLabel}</AppText>
                  </Row>
                ) : null}
              </Row>
            ) : null}
          </Pressable>
        </Cluster>

        {onMoveUp || onMoveDown ? (
          <Row justify="end" gap={spacing[2]} style={styles.reorderRow}>
            <Pressable
              onPress={onMoveUp}
              disabled={index === 0}
              style={[styles.reorderBtn, index === 0 && styles.reorderDisabled]}
              accessibilityLabel="Monter"
            >
              <ChevronUp size={iconSize.md} color={index === 0 ? c.textTertiary : c.textSecondary} />
            </Pressable>
            <Pressable
              onPress={onMoveDown}
              disabled={index >= total - 1}
              style={[styles.reorderBtn, index >= total - 1 && styles.reorderDisabled]}
              accessibilityLabel="Descendre"
            >
              <ChevronDown
                size={iconSize.md}
                color={index >= total - 1 ? c.textTertiary : c.textSecondary}
              />
            </Pressable>
          </Row>
        ) : null}
      </View>
    </Animated.View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    cardInner: {
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[3.5],
    },
    cardAbsent: {},
    nameCol: { flex: 1, minWidth: 0, gap: spacing[0.5] },
    nameRow: { minWidth: 0, alignSelf: 'stretch' as const },
    nameFlex: { flexShrink: 1, minWidth: 0 },
    name: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      letterSpacing: -0.15,
    },
    meta: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
    },
    metaInline: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
    },
    routeSegment: {
      flexShrink: 0,
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
    checkHit: {
      alignSelf: 'center' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    checkOuter: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth * 2,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    reorderRow: { marginTop: spacing[2], paddingTop: spacing[1] },
    reorderBtn: { padding: spacing[1] },
    reorderDisabled: { opacity: 0.35 },
  };
}
