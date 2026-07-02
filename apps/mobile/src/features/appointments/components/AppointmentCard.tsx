import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MapPin, Clock } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { listItemEntering, enteringShell } from '@/lib/platform/list-entering-animation';
import { Box, Cluster, Row, Stack } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
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
  showOfferActions,
  onAccept,
  onRefuse,
}: AppointmentCardProps) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'AppointmentCard');
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
  const fd = appointment.form_data as Record<string, unknown> | undefined;
  const timeLabel = formatAvailabilityDisplayFr(
    fd?.availability,
    appointment.scheduled_at,
    fd,
  );

  const entering = listItemEntering(index);
  const EnterShell = enteringShell(entering);

  return (
    <EnterShell entering={entering}>
      <Animated.View style={animStyle}>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          style={[styles.card, elevation.sm]}
        >
          <Cluster
            align="start"
            gap={spacing[3]}
            style={styles.header}
            actions={<StatusBadge status={appointment.status} />}
          >
            <Stack gap={4}>
              <Animated.Text style={styles.patientName} numberOfLines={1}>
                {patientName}
              </Animated.Text>
              {careLines.length > 0 ? (
                <Animated.Text style={styles.careText} numberOfLines={1}>
                  {careLines[0]}
                </Animated.Text>
              ) : null}
            </Stack>
          </Cluster>

          <View style={styles.divider} />

          <Stack gap={spacing[1.5]}>
            {scheduledAt ? (
              <Row gap={spacing[2]} align="center">
                <View style={styles.metaIconWrap}>
                  <Clock size={12} color={c.primary} strokeWidth={2.5} />
                </View>
                <Animated.Text style={styles.metaText} numberOfLines={2}>
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
              </Row>
            ) : null}

            {address ? (
              <Row gap={spacing[2]} align="center">
                <View style={styles.metaIconWrap}>
                  <MapPin size={12} color={c.textTertiary} strokeWidth={2.5} />
                </View>
                <Animated.Text style={[styles.metaText, styles.metaAddress]} numberOfLines={1}>
                  {address}
                </Animated.Text>
              </Row>
            ) : null}
          </Stack>

          {showOfferActions && onAccept && onRefuse ? (
            <Row gap={spacing[2]} style={styles.offerActions}>
              <Box flex={1}>
                <Button
                  title="Refuser"
                  variant="dangerOutline"
                  size="sm"
                  fullWidth
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onRefuse();
                  }}
                />
              </Box>
              <Box flex={1}>
                <Button
                  title="Accepter"
                  variant="primary"
                  size="sm"
                  fullWidth
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    onAccept();
                  }}
                />
              </Box>
            </Row>
          ) : null}
        </Pressable>
      </Animated.View>
    </EnterShell>
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
      marginBottom: spacing[3],
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
    metaIconWrap: {
      width: 20,
      alignItems: 'center' as const,
      flexShrink: 0,
    },
    metaText: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.textSecondary,
    },
    metaTime: {
      fontFamily: fontFamily.bold,
      color: c.primary,
    },
    metaAddress: {
      color: c.textTertiary,
    },
    offerActions: {
      marginTop: spacing[3],
      paddingTop: spacing[3],
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
    },
  };
}
