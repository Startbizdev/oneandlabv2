import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { buildNavigationUrl } from '@oneandlab/shared-utils';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { MapPin, Navigation } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Cluster, Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { getAppointmentListCardStyles } from '@/utils/appointment-list-card-styles';
import type { NurseTourStop } from '../api/nurse-tour.service';
import { spacing } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';
import { hexToRgba } from '@/theme/color-utils';
import dayjs from 'dayjs';

type Props = {
  stop: NurseTourStop;
  onNavigate?: () => void;
};

export function TourNextStopHero({ stop, onNavigate }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const cardStyles = getAppointmentListCardStyles();
  const time = stop.scheduled_at ? dayjs(stop.scheduled_at).format('HH:mm') : '—';

  const openNav = () => {
    const url = buildNavigationUrl('waze', {
      lat: stop.lat,
      lng: stop.lng,
      addressLine: stop.address_line,
    });
    if (url) void Linking.openURL(url);
    onNavigate?.();
  };

  return (
    <Animated.View entering={FadeInDown.duration(320).springify()} style={styles.wrap}>
      <View style={cardStyles.cardShell}>
        <View style={[cardStyles.card, styles.heroInner, { backgroundColor: hexToRgba(c.primary, 0.06) }]}>
          <View style={[styles.kickerPill, { backgroundColor: c.primaryLight }]}>
            <Navigation size={12} color={c.primary} strokeWidth={2.5} />
            <Text style={[styles.kicker, { color: c.primaryDark }]}>Prochain passage</Text>
          </View>

          <Cluster
            gap={spacing[3]}
            align="center"
            leading={
              <ProfileAvatar
                profileImageUrl={stop.profile_image_url}
                seed={stop.patient_id ?? stop.patient_name}
                gender={stop.patient_gender}
                size={52}
                style={[styles.avatar, { borderColor: c.borderLight }]}
              />
            }
          >
            <View style={styles.heroText}>
              <Text style={[styles.title, { color: c.textPrimary }]}>{stop.patient_name}</Text>
              <Text style={[styles.meta, { color: c.textSecondary }]}>
                {time} · {stop.category_name || 'Soin'}
              </Text>
            </View>
          </Cluster>

          {stop.address_line ? (
            <Cluster
              gap={spacing[1.5]}
              align="start"
              leading={<MapPin size={14} color={c.primary} strokeWidth={2} />}
            >
              <Text style={[styles.addr, { color: c.textSecondary }]} numberOfLines={2}>
                {stop.address_line}
              </Text>
            </Cluster>
          ) : null}

          {stop.distance_km_from_prev > 0 ? (
            <Text style={[styles.dist, { color: c.textTertiary }]}>
              ~{stop.drive_min_from_prev} min · {stop.distance_km_from_prev.toFixed(1)} km
            </Text>
          ) : null}

          <Button
            title="Lancer la navigation"
            size="md"
            variant="primary"
            fullWidth
            leftIcon={<Navigation size={16} color={c.textInverse} strokeWidth={2.5} />}
            onPress={openNav}
          />
        </View>
      </View>
    </Animated.View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    wrap: { marginBottom: spacing[3] },
    heroInner: {
      padding: spacing[4],
      gap: spacing[2.5],
    },
    kickerPill: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      alignSelf: 'flex-start' as const,
      gap: spacing[1],
      paddingHorizontal: spacing[2.5],
      paddingVertical: spacing[1],
      borderRadius: 999,
    },
    kicker: { fontFamily: fontFamily.bold, fontSize: fontSize.xs, letterSpacing: 0.2 },
    avatar: { borderWidth: StyleSheet.hairlineWidth },
    heroText: { flex: 1, minWidth: 0, gap: spacing[0.5] },
    title: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.lg,
      lineHeight: lh(fontSize.lg),
      letterSpacing: -0.3,
    },
    meta: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm),
    },
    addr: {
      flex: 1,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm),
    },
    dist: { fontFamily: fontFamily.regular, fontSize: fontSize.xs },
  };
}
