import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { buildNavigationUrl } from '@oneandlab/shared-utils';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import {
  CalendarPlus,
  Check,
  Clock,
  MapPin,
  Navigation,
  Pencil,
  Phone,
} from 'lucide-react-native';
import { Cluster, Row, Stack } from '@/components/layout/primitives';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { getAppointmentListCardStyles } from '@/utils/appointment-list-card-styles';
import { formatPassageStopTimeLabel } from '@oneandlab/shared-utils';
import { formatAvailabilityDisplayFr } from '@/utils/appointment-datetime-fr';
import type { NurseTourStop } from '../api/nurse-tour.service';
import { TourStopCareSection } from './TourStopCareSection';
import { TourStopCompletedStamp } from './TourStopCompletedStamp';
import { TourStopReorderControls } from './TourStopReorderControls';
import { spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';
import { hexToRgba } from '@/theme/color-utils';

const WAZE_BRAND = '#33CCFF';

const CARD_PAD_X = spacing[4];
const CARD_PAD_Y = spacing[3.5];
/** Colonne ↑↓ en haut à droite */
const REORDER_COL_W = 36;

type Props = {
  stop: NurseTourStop;
  index: number;
  total: number;
  isNext?: boolean;
  onPress?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onMarkDone?: () => void;
  onToggleDone?: () => void;
  onAddToCalendar?: () => void;
  onReschedule?: () => void;
};

export function TourStopCard({
  stop,
  index,
  total,
  isNext = false,
  onPress,
  onMoveUp,
  onMoveDown,
  onMarkDone,
  onToggleDone,
  onAddToCalendar,
  onReschedule,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const cardStyles = getAppointmentListCardStyles();
  const done = stop.visit_status === 'done' || stop.visit_status === 'skipped';
  const timeLabel =
    formatPassageStopTimeLabel({
      passage_time_slot: stop.passage_time_slot,
      scheduled_at: stop.scheduled_at,
      availability: stop.availability,
      passage_custom_time: stop.passage_custom_time,
    }) ?? formatAvailabilityDisplayFr(stop.availability, stop.scheduled_at, {
      passage_time_slot: stop.passage_time_slot,
      passage_source: 'nurse_passage',
      custom_time: stop.passage_custom_time,
      availability: stop.availability,
    });
  const canMoveUp = index > 0;
  const canMoveDown = index < total - 1;
  const showReorder = total > 1 && !done;

  const openNav = () => {
    const url = buildNavigationUrl('waze', {
      lat: stop.lat,
      lng: stop.lng,
      addressLine: stop.address_line,
    });
    if (url) void Linking.openURL(url);
  };

  const call = () => {
    if (stop.phone) void Linking.openURL(`tel:${stop.phone}`);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 35).duration(280).springify()}>
      <View style={cardStyles.cardShell}>
        <View
          style={[
            cardStyles.card,
            done && styles.cardDone,
            done && { borderColor: hexToRgba(c.success, 0.28), backgroundColor: hexToRgba(c.success, 0.1) },
            isNext && !done && styles.cardNext,
            isNext && !done && { borderColor: c.primary },
          ]}
        >
          <View style={[styles.body, done && styles.bodyDone]}>
            {showReorder ? (
              <View style={styles.reorderSlot} pointerEvents="box-none">
                <TourStopReorderControls
                  canMoveUp={canMoveUp}
                  canMoveDown={canMoveDown}
                  onMoveUp={onMoveUp}
                  onMoveDown={onMoveDown}
                />
              </View>
            ) : null}

            <Pressable
              onPress={onPress}
              disabled={!onPress}
              accessibilityRole="button"
              accessibilityLabel={`Ouvrir le détail du passage de ${stop.patient_name}`}
              style={({ pressed }) => [
                styles.bodyPress,
                showReorder && styles.bodyPressWithReorder,
                done && styles.bodyPressDone,
                done && styles.contentMuted,
                pressed && onPress && !done && styles.cardPressed,
              ]}
            >
              <Cluster
                gap={spacing[2.5]}
                align="start"
                leading={
                  <View style={styles.avatarWrap}>
                    <ProfileAvatar
                      profileImageUrl={stop.profile_image_url}
                      seed={stop.patient_id ?? stop.patient_name}
                      gender={stop.patient_gender}
                      size={iconSize['4xl']}
                      style={[styles.avatar, { borderColor: c.borderLight }]}
                    />
                    <View
                      style={[
                        styles.positionBadge,
                        { backgroundColor: done ? c.success : c.primary },
                      ]}
                    >
                      {done ? (
                        <Check size={iconSize['3xs']} color="#fff" strokeWidth={3} />
                      ) : (
                        <AppText style={styles.positionText}>{stop.position}</AppText>
                      )}
                    </View>
                  </View>
                }
              >
                <View style={styles.headText}>
                  <Row gap={spacing[1.5]} align="center" wrap>
                    <AppText
                      style={[
                        styles.name,
                        { color: done ? c.textSecondary : c.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {stop.patient_name}
                    </AppText>
                    {done ? (
                      <Badge label="Effectué" variant="success" size="sm" dot={false} />
                    ) : null}
                    {isNext && !done ? (
                      <Badge label="Suivant" variant="primary" size="sm" dot={false} />
                    ) : null}
                  </Row>
                  <TourStopCareSection stop={stop} embedded muted={done} />
                </View>
              </Cluster>

              {timeLabel ? (
                <Row gap={spacing[2]} align="center" style={styles.metaRow}>
                  <View style={styles.metaIconWrap}>
                    <Clock size={iconSize['2xs']} color={done ? c.textTertiary : c.primary} strokeWidth={2.5} />
                  </View>
                  <Row align="center" gap={spacing[1.5]} style={styles.timeCluster}>
                    <AppText
                      style={[
                        styles.metaTime,
                        { color: done ? c.textTertiary : c.primary },
                      ]}
                    >
                      {timeLabel}
                    </AppText>
                    {!done && onReschedule ? (
                      <Pressable
                        onPress={onReschedule}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Modifier la date et le créneau"
                        style={({ pressed }) => [styles.penBtn, pressed && styles.penBtnPressed]}
                      >
                        <Pencil size={iconSize.sm} color={c.textTertiary} strokeWidth={2.2} />
                      </Pressable>
                    ) : null}
                  </Row>
                </Row>
              ) : null}

              {stop.address_line ? (
                <Row gap={spacing[2]} align="start" style={styles.metaRow}>
                  <View style={styles.metaIconWrap}>
                    <MapPin size={iconSize['2xs']} color={c.textTertiary} strokeWidth={2.5} />
                  </View>
                  <Stack gap={spacing[0.5]} style={styles.addrStack}>
                    <AppText
                      style={[
                        styles.metaLine,
                        { color: done ? c.textTertiary : c.textSecondary },
                      ]}
                      numberOfLines={2}
                    >
                      {stop.address_line}
                    </AppText>
                    {stop.address_complement ? (
                      <AppText style={[styles.complement, { color: c.textTertiary }]} numberOfLines={1}>
                        {stop.address_complement}
                      </AppText>
                    ) : null}
                  </Stack>
                </Row>
              ) : null}

              {stop.distance_km_from_prev > 0 ? (
                <AppText style={[styles.dist, { color: c.textTertiary }]}>
                  {stop.distance_km_from_prev.toFixed(1)} km · ~{stop.drive_min_from_prev} min
                </AppText>
              ) : null}
            </Pressable>

            {done ? <TourStopCompletedStamp /> : null}

            {done && onToggleDone ? (
              <Pressable
                onPress={onToggleDone}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Passage effectué, appuyer pour remettre à faire"
                style={({ pressed }) => [styles.undoCheck, pressed && styles.undoCheckPressed]}
              >
                <View
                  style={[
                    styles.undoCheckOuter,
                    { borderColor: c.success, backgroundColor: c.success },
                  ]}
                >
                  <Check size={iconSize.mdSm} color="#FFFFFF" strokeWidth={2.5} />
                </View>
              </Pressable>
            ) : null}
          </View>

          {!done ? (
            <View style={[styles.actions, { borderTopColor: c.borderLight }]}>
              <Row gap={spacing[2]}>
                <View style={styles.actionFlex}>
                  <Button
                    title="Waze"
                    size="sm"
                    variant="primary"
                    fullWidth
                    style={{ backgroundColor: WAZE_BRAND }}
                    leftIcon={<Navigation size={iconSize.xs} color="#FFFFFF" strokeWidth={2.5} />}
                    onPress={openNav}
                  />
                </View>
                {stop.phone ? (
                  <View style={styles.actionFlex}>
                    <Button
                      title="Appeler"
                      size="sm"
                      variant="secondary"
                      fullWidth
                      leftIcon={<Phone size={iconSize.xs} color={c.primary} strokeWidth={2.5} />}
                      onPress={call}
                    />
                  </View>
                ) : null}
              </Row>

              <Row gap={spacing[2]}>
                <View style={styles.actionFlex}>
                  <Button
                    title="Calendrier"
                    size="sm"
                    variant="outline"
                    fullWidth
                    leftIcon={<CalendarPlus size={iconSize.xs} color={c.primary} strokeWidth={2.2} />}
                    onPress={onAddToCalendar}
                  />
                </View>
                <View style={styles.actionFlex}>
                  <Button
                    title="Terminer"
                    size="sm"
                    variant="primary"
                    fullWidth
                    style={{ backgroundColor: c.success }}
                    leftIcon={<Check size={iconSize.xs} color="#FFFFFF" strokeWidth={2.5} />}
                    onPress={onMarkDone}
                  />
                </View>
              </Row>
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

function buildStyles(c: AppColors) {
  return {
    cardDone: {
      overflow: 'hidden' as const,
    },
    body: {
      position: 'relative' as const,
    },
    bodyDone: {
      minHeight: 148,
    },
    reorderSlot: {
      position: 'absolute' as const,
      top: CARD_PAD_Y,
      right: CARD_PAD_X,
      zIndex: 2,
    },
    bodyPress: {
      alignSelf: 'stretch' as const,
      paddingHorizontal: CARD_PAD_X,
      paddingTop: CARD_PAD_Y,
      paddingBottom: spacing[2.5],
    },
    bodyPressWithReorder: {
      paddingRight: CARD_PAD_X + REORDER_COL_W,
    },
    bodyPressDone: {
      paddingBottom: CARD_PAD_Y,
    },
    contentMuted: {
      opacity: 0.3,
    },
    cardNext: {
      borderWidth: 1.5,
      backgroundColor: hexToRgba(c.primary, 0.03),
    },
    cardPressed: { opacity: 0.92 },
    avatarWrap: { position: 'relative' as const },
    avatar: { borderWidth: StyleSheet.hairlineWidth },
    positionBadge: {
      position: 'absolute' as const,
      right: -3,
      bottom: -3,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 4,
    },
    positionText: {
      color: '#fff',
      fontFamily: fontFamily.bold,
      fontSize: fontSize['2xs'],
    },
    headText: { flex: 1, minWidth: 0, gap: spacing[1] },
    name: {
      minWidth: 0,
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.base,
      lineHeight: lh(fontSize.base),
      letterSpacing: -0.2,
      flexShrink: 1,
    },
    metaRow: { marginTop: spacing[2.5] },
    metaIconWrap: {
      width: 18,
      paddingTop: 1,
      alignItems: 'center' as const,
      flexShrink: 0,
    },
    metaLine: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs),
    },
    metaTime: {
      minWidth: 0,
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs),
      flexShrink: 1,
    },
    timeCluster: {
      flex: 1,
      minWidth: 0,
      flexWrap: 'wrap' as const,
    },
    penBtn: {
      padding: 2,
      borderRadius: 6,
      flexShrink: 0,
    },
    penBtnPressed: { opacity: 0.65 },
    addrStack: { flex: 1, minWidth: 0 },
    complement: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs),
    },
    dist: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      marginTop: spacing[1.5],
      marginLeft: spacing[2] + 18,
    },
    actions: {
      paddingHorizontal: CARD_PAD_X,
      paddingBottom: CARD_PAD_Y,
      paddingTop: spacing[2.5],
      borderTopWidth: StyleSheet.hairlineWidth,
      gap: spacing[2],
    },
    actionFlex: { flex: 1, minWidth: 0 },
    undoCheck: {
      position: 'absolute' as const,
      top: CARD_PAD_Y,
      right: CARD_PAD_X,
      zIndex: 10,
    },
    undoCheckPressed: { opacity: 0.75 },
    undoCheckOuter: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth * 2,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
  };
}
