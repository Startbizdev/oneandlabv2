import { useAppColors } from '@/theme/use-app-colors';
import { useCallback } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Map, Navigation } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/skeletons';
import { useToast } from '@/providers/ToastProvider';
import { useAppointmentNavigation } from '../hooks/use-appointment-navigation';
import {
  resolveAppointmentAddressComplement,
  resolveAppointmentDetailAddressLine,
  resolveAppointmentMapCoords,
} from '../utils/appointment-address-display';
import { useRdvDetailSectionStyles } from './layout/rdv-detail-section-styles';
import { radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  apt: Appointment;
  batch?: Appointment[];
  batchLoading?: boolean;
  showMapActions?: boolean;
  rowIndex?: number;
}

export function RdvAddressFieldRow({
  apt,
  batch,
  batchLoading = false,
  showMapActions = false,
  rowIndex = 0,
}: Props) {
  const section = useRdvDetailSectionStyles();
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const { show: toast } = useToast();
  const navigation = useAppointmentNavigation(apt, batch);

  const line = resolveAppointmentDetailAddressLine(apt, batch);
  const complement = resolveAppointmentAddressComplement(apt);
  const coords = resolveAppointmentMapCoords(apt);

  const openGoogleMaps = useCallback(() => {
    const url = coords
      ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
      : line
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(line)}`
        : null;
    if (!url) return;
    Linking.openURL(url).catch((error: unknown) => {
      if (__DEV__) console.warn('[rdv-address] ouverture carte impossible', url, error);
      toast('Impossible d’ouvrir la carte', { type: 'error' });
    });
  }, [coords, line, toast]);

  const hasBatchSiblings =
    Array.isArray(apt.batch_siblings) && apt.batch_siblings.length > 0;
  const pending = hasBatchSiblings && batchLoading && !line;

  if (!line && !pending) return null;

  return (
    <View
      style={[
        section.sectionRow,
        styles.row,
        rowIndex > 0 && section.rowBorder,
      ]}
    >
      <AppText style={styles.label}>Adresse</AppText>
      {pending ? (
        <Skeleton height={18} width="88%" borderRadius={radius.sm} />
      ) : (
        <View style={styles.valueBlock}>
          <AppText style={styles.value}>{line}</AppText>
          {complement ? (
            <AppText style={styles.complement}>Complément : {complement}</AppText>
          ) : null}
          {showMapActions && line ? (
            <Row gap={4} align="center" style={styles.mapActions}>
              <Button
                title="Carte"
                variant="muted"
                size="sm"
                leftIcon={<Map size={iconSize['2xs']} color={c.textSecondary} strokeWidth={2.25} />}
                onPress={openGoogleMaps}
              />
              {navigation.canNavigate ? (
                <Button
                  title={navigation.appLabel}
                  variant="muted"
                  size="sm"
                  leftIcon={
                    <Navigation size={iconSize['2xs']} color={c.textSecondary} strokeWidth={2.25} />
                  }
                  onPress={() => void navigation.open()}
                  accessibilityLabel={`Itinéraire ${navigation.appLabel}`}
                />
              ) : null}
            </Row>
          ) : null}
        </View>
      )}
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  row: {
    gap: spacing[1],
  },
  label: {
    ...font.medium,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  valueBlock: {
    gap: spacing[1],
  },
  value: {
    minWidth: 0,
    ...font.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
    lineHeight: fontSize.base * 1.4,
    flexShrink: 1,
  },
  complement: {
    ...font.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.35,
  },
  mapActions: {
    paddingTop: spacing[1],
    alignSelf: 'flex-start' as const,
  },
};
}
