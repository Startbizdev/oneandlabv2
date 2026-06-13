import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Map, Navigation } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/skeletons';
import {
  resolveAppointmentAddressComplement,
  resolveAppointmentDetailAddressLine,
  resolveAppointmentMapCoords,
} from '../utils/appointment-address-display';
import { getRdvDetailSectionStyles } from './layout/rdv-detail-section-styles';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_RdvAddressFieldRow_tsx_RdvAddressFieldRow_styles');

  const line = resolveAppointmentDetailAddressLine(apt, batch);
  const complement = resolveAppointmentAddressComplement(apt);
  const coords = resolveAppointmentMapCoords(apt);

  const openGoogleMaps = useCallback(() => {
    if (coords) {
      void Linking.openURL(`https://www.google.com/maps?q=${coords.lat},${coords.lng}`);
      return;
    }
    if (line) {
      void Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(line)}`,
      );
    }
  }, [coords, line]);

  const openWaze = useCallback(() => {
    if (coords) {
      void Linking.openURL(
        `https://waze.com/ul?ll=${coords.lat},${coords.lng}&navigate=yes`,
      );
      return;
    }
    if (line) {
      void Linking.openURL(`https://waze.com/ul?q=${encodeURIComponent(line)}&navigate=yes`);
    }
  }, [coords, line]);

  const hasBatchSiblings =
    Array.isArray(apt.batch_siblings) && apt.batch_siblings.length > 0;
  const pending = hasBatchSiblings && batchLoading && !line;

  if (!line && !pending) return null;

  return (
    <View
      style={[
        getRdvDetailSectionStyles().sectionRow,
        styles.row,
        rowIndex > 0 && getRdvDetailSectionStyles().rowBorder,
      ]}
    >
      <Text style={styles.label}>Adresse</Text>
      {pending ? (
        <Skeleton height={18} width="88%" borderRadius={radius.sm} />
      ) : (
        <View style={styles.valueBlock}>
          <Text style={styles.value}>{line}</Text>
          {complement ? (
            <Text style={styles.complement}>Complément : {complement}</Text>
          ) : null}
          {showMapActions && line ? (
            <Row gap={4} align="center" style={styles.mapActions}>
              <Button
                title="Carte"
                variant="muted"
                size="sm"
                leftIcon={<Map size={11} color={c.textSecondary} strokeWidth={2.25} />}
                onPress={openGoogleMaps}
              />
              <Button
                title="Waze"
                variant="muted"
                size="sm"
                leftIcon={
                  <Navigation size={11} color={c.textSecondary} strokeWidth={2.25} />
                }
                onPress={openWaze}
                accessibilityLabel="Itinéraire Waze"
              />
            </Row>
          ) : null}
        </View>
      )}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  row: {
    gap: spacing[1],
  },
  label: {
    fontFamily: fontFamily.medium,
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
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
    lineHeight: fontSize.base * 1.4,
    flexShrink: 1,
  },
  complement: {
    fontFamily: fontFamily.regular,
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
