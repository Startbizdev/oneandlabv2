import { useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Check, Clock, MapPin, Navigation, Phone } from 'lucide-react-native';
import { Cluster, Row, Stack } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { useToast } from '@/providers/ToastProvider';
import { useAppColors } from '@/theme/use-app-colors';
import { lh } from '@/theme/typography';
import { hexToRgba } from '@/theme/color-utils';
import { ICON_STROKE_WIDTH, radius, spacing, iconSize, AppText, useStyles, font, elevation, type Theme } from '@/theme';
import type { NavAppPref } from '../api/nurse-tour.service';
import { buildTourNavigationUrl, openTourNavigation } from '../utils/tour-navigation';

/** Champs communs aux arrêts de tournée infirmier et préleveur. */
export type TourStopCardStop = {
  stop_id: string;
  position: number;
  patient_name: string;
  patient_id?: string | null;
  patient_gender?: string | null;
  profile_image_url?: string | null;
  address_line: string;
  address_complement?: string;
  lat?: number | null;
  lng?: number | null;
  distance_km_from_prev: number;
  drive_min_from_prev: number;
  phone?: string;
};

type Props = {
  stop: TourStopCardStop;
  timeLabel: string;
  navAppPref: NavAppPref;
  /** Ex. « Prochain passage · 2 sur 6 ». */
  eyebrow?: string;
  /** Soins ou type d'analyse, affichés sous le nom. */
  care?: ReactNode;
  onPress?: () => void;
  /** Absent : pas d'action « Terminé » (ex. préleveur, aucune API de statut). */
  onMarkDone?: () => Promise<void>;
  footer?: ReactNode;
};

/** Carte « prochain passage » : infos d'arrivée et actions terrain Naviguer / Appeler / Terminé. */
export function TourStopCard({
  stop,
  timeLabel,
  navAppPref,
  eyebrow,
  care,
  onPress,
  onMarkDone,
  footer,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const { show: toast } = useToast();
  const [marking, setMarking] = useState(false);
  const navTarget = { lat: stop.lat, lng: stop.lng, addressLine: stop.address_line };
  const canNavigate = Boolean(buildTourNavigationUrl(navAppPref, navTarget));
  const phone = stop.phone?.replace(/\s/g, '') ?? '';

  const openNav = async () => {
    const opened = await openTourNavigation(navAppPref, navTarget);
    if (!opened) toast('Impossible d’ouvrir l’itinéraire', { type: 'error' });
  };

  const call = () => {
    Linking.openURL(`tel:${phone}`).catch((error: unknown) => {
      if (__DEV__) console.warn('[tour] appel impossible', error);
      toast('Impossible de lancer l’appel', { type: 'error' });
    });
  };

  const markDone = async () => {
    if (!onMarkDone) return;
    setMarking(true);
    try {
      await onMarkDone();
    } finally {
      setMarking(false);
    }
  };

  return (
    <View style={[styles.shell, elevation.md]}>
      <View style={styles.card}>
        <Pressable
          onPress={onPress}
          disabled={!onPress}
          accessibilityRole="button"
          accessibilityLabel={`Ouvrir le passage de ${stop.patient_name}`}
          style={({ pressed }) => [styles.body, pressed && onPress && styles.bodyPressed]}
        >
          {eyebrow ? <AppText style={styles.eyebrow}>{eyebrow}</AppText> : null}
          <Cluster
            gap={spacing[3]}
            align="start"
            leading={
              <ProfileAvatar
                profileImageUrl={stop.profile_image_url}
                seed={stop.patient_id ?? stop.patient_name}
                gender={stop.patient_gender}
                size={iconSize['2xl']}
                style={[styles.avatar, { borderColor: c.borderLight }]}
              />
            }
          >
            <Stack gap={spacing[1]} style={styles.headText}>
              <AppText style={styles.name}>
                {stop.patient_name}
              </AppText>
              {timeLabel ? (
                <Row gap={spacing[1.5]} align="center">
                  <Clock size={iconSize['2xs']} color={c.primaryDark} strokeWidth={ICON_STROKE_WIDTH} />
                  <AppText style={styles.time}>{timeLabel}</AppText>
                </Row>
              ) : null}
              {care}
            </Stack>
          </Cluster>

          {stop.address_line ? (
            <Row gap={spacing[2]} align="start" style={styles.addressRow}>
              <View style={styles.metaIconWrap}>
                <MapPin size={iconSize['2xs']} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
              </View>
              <Stack gap={spacing[0.5]} style={styles.addressStack}>
                <AppText style={styles.address}>
                  {stop.address_line}
                </AppText>
                {stop.address_complement ? (
                  <AppText style={styles.complement}>
                    {stop.address_complement}
                  </AppText>
                ) : null}
                {stop.distance_km_from_prev > 0 ? (
                  <AppText style={styles.complement}>
                    {stop.distance_km_from_prev.toFixed(1)} km · ~{stop.drive_min_from_prev} min
                  </AppText>
                ) : null}
              </Stack>
            </Row>
          ) : null}
        </Pressable>

        <Stack gap={spacing[2]} style={styles.actions}>
          <Row gap={spacing[2]}>
            <View style={styles.actionFlex}>
              <Button
                title="Naviguer"
                variant="secondary"
                fullWidth
                disabled={!canNavigate}
                leftIcon={<Navigation size={iconSize.xs} color={c.textLink} strokeWidth={ICON_STROKE_WIDTH} />}
                onPress={() => void openNav()}
                accessibilityLabel={`Itinéraire vers ${stop.patient_name}`}
              />
            </View>
            {phone ? (
              <View style={styles.actionFlex}>
                <Button
                  title="Appeler"
                  variant="secondary"
                  fullWidth
                  leftIcon={<Phone size={iconSize.xs} color={c.textLink} strokeWidth={ICON_STROKE_WIDTH} />}
                  onPress={call}
                  accessibilityLabel={`Appeler ${stop.patient_name}`}
                />
              </View>
            ) : null}
          </Row>
          {onMarkDone ? (
            <Button
              title="Terminé"
              variant="primary"
              fullWidth
              loading={marking}
              leftIcon={<Check size={iconSize.xs} color={c.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
              onPress={() => void markDone()}
              accessibilityLabel={`Marquer le passage de ${stop.patient_name} comme effectué`}
            />
          ) : null}
          {footer}
        </Stack>
      </View>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    shell: {
      borderRadius: radius.xl,
      marginBottom: spacing[3],
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1.5,
      borderColor: c.primary,
      overflow: 'hidden' as const,
    },
    body: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[3.5],
      paddingBottom: spacing[3],
      gap: spacing[2.5],
    },
    bodyPressed: { backgroundColor: hexToRgba(c.primary, 0.04) },
    eyebrow: {
      ...font.semiBold,
      fontSize: fontSize.xs,
      color: c.primaryDark,
    },
    avatar: { borderWidth: StyleSheet.hairlineWidth },
    headText: { flex: 1, minWidth: 0 },
    name: {
      ...font.semiBold,
      fontSize: fontSize.md,
      lineHeight: lh(fontSize.md),
      color: c.textPrimary,
      letterSpacing: -0.2,
    },
    time: {
      ...font.bold,
      fontSize: fontSize.sm,
      color: c.primaryDark,
      flexShrink: 1,
      minWidth: 0,
    },
    addressRow: { minWidth: 0 },
    metaIconWrap: {
      width: iconSize.sm,
      paddingTop: spacing[0.5],
      alignItems: 'center' as const,
      flexShrink: 0,
    },
    addressStack: { flex: 1, minWidth: 0 },
    address: {
      ...font.medium,
      fontSize: fontSize.sm,
      lineHeight: lh(fontSize.sm),
      color: c.textSecondary,
    },
    complement: {
      ...font.regular,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs),
      color: c.textTertiary,
    },
    actions: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[3],
      paddingBottom: spacing[3.5],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
    },
    actionFlex: { flex: 1, minWidth: 0 },
  };
}
