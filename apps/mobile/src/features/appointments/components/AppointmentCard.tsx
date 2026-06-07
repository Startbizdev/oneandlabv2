import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MapPin, Clock } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { StatusBadge } from '@/components/ui/Badge';
import {
  appointmentAddressLine,
  appointmentCareLines,
  appointmentPatientName,
} from '@/utils/appointment-display';
import { formatAvailabilityDisplayFr } from '@/utils/appointment-datetime-fr';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { elevation, radius, spacing, animation } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

dayjs.locale('fr');

interface AppointmentCardProps {
  appointment: Appointment;
  onPress: () => void;
  index?: number;
  subtitle?: string;
  showOfferActions?: boolean;
  onAccept?: () => void;
  onRefuse?: () => void;
}

function AppointmentCardComponent({
  appointment,
  onPress,
  index = 0,
  subtitle,
  showOfferActions,
  onAccept,
  onRefuse,
}: AppointmentCardProps) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.975, animation.spring.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, animation.spring.bouncy);
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const patientName = appointmentPatientName(appointment);
  const address = appointmentAddressLine(appointment);
  const careLines = appointmentCareLines(appointment);
  const scheduledAt = appointment.scheduled_at ? dayjs(appointment.scheduled_at) : null;
  const fd = appointment.form_data as { availability?: unknown } | undefined;
  const timeLabel = formatAvailabilityDisplayFr(fd?.availability, appointment.scheduled_at);

  return (
    <Animated.View entering={FadeIn.delay(index * 50).duration(350)}>
      <Animated.View style={animStyle}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={[styles.card, elevation.sm]}
      >
        {/* Header row */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Animated.Text style={styles.patientName} numberOfLines={1}>
              {patientName}
            </Animated.Text>
            {careLines.length > 0 && (
              <Animated.Text style={styles.careText} numberOfLines={1}>
                {careLines[0]}
              </Animated.Text>
            )}
          </View>
          <StatusBadge status={appointment.status} />
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Meta row */}
        <View style={styles.meta}>
          {scheduledAt && (
            <View style={styles.metaItem}>
              <View style={styles.metaIconWrap}>
                <Clock size={12} color={c.primary} strokeWidth={2.5} />
              </View>
              <Animated.Text style={styles.metaText}>
                {scheduledAt.format('ddd D MMM')}
                {timeLabel ? (
                  <>
                    {' · '}
                    <Animated.Text style={[styles.metaText, styles.metaTime]}>
                      {timeLabel}
                    </Animated.Text>
                  </>
                ) : null}
              </Animated.Text>
            </View>
          )}

          {address && (
            <View style={styles.metaItem}>
              <View style={styles.metaIconWrap}>
                <MapPin size={12} color={c.textTertiary} strokeWidth={2.5} />
              </View>
              <Animated.Text style={[styles.metaText, styles.metaAddress]} numberOfLines={1}>
                {address}
              </Animated.Text>
            </View>
          )}
        </View>

        {/* Offer actions */}
        {showOfferActions && onAccept && onRefuse ? (
          <View style={styles.offerActions}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onRefuse();
              }}
              style={[styles.offerBtn, styles.refuseBtn]}
            >
              <Animated.Text style={[styles.offerBtnText, styles.refuseBtnText]}>
                Refuser
              </Animated.Text>
            </Pressable>
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onAccept();
              }}
              style={[styles.offerBtn, styles.acceptBtn]}
            >
              <Animated.Text style={[styles.offerBtnText, styles.acceptBtnText]}>
                Accepter
              </Animated.Text>
            </Pressable>
          </View>
        ) : null}
      </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export const AppointmentCard = React.memo(AppointmentCardComponent);

function buildStyles(c: AppColors) {
  return {
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  headerLeft: {
    flex: 1,
    gap: 4,
  },
  patientName: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: c.textPrimary,
    letterSpacing: -0.2,
  },
  careText: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: c.borderLight,
    marginBottom: spacing[3],
  },
  meta: {
    gap: spacing[1.5],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  metaIconWrap: {
    width: 20,
    alignItems: 'center',
  },
  metaText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    flex: 1,
  },
  metaTime: {
    fontFamily: fontFamily.bold,
    color: c.primary,
  },
  metaAddress: {
    color: c.textTertiary,
  },
  offerActions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
  },
  offerBtn: {
    flex: 1,
    paddingVertical: spacing[2.5],
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refuseBtn: {
    backgroundColor: c.errorLight,
    borderWidth: 1,
    borderColor: c.errorMid,
  },
  acceptBtn: {
    backgroundColor: c.primary,
  },
  offerBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
  },
  refuseBtnText: {
    color: c.error,
  },
  acceptBtnText: {
    color: c.textInverse,
  },
};
}
