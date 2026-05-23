import { useCallback } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Map, Navigation } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/skeletons';
import {
  resolveAppointmentAddressComplement,
  resolveAppointmentDetailAddressLine,
  resolveAppointmentMapCoords,
} from '../utils/appointment-address-display';
import { rdvDetailSectionStyles } from './layout/rdv-detail-section-styles';
import { colors, radius, spacing } from '@/theme';
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
        rdvDetailSectionStyles.sectionRow,
        styles.row,
        rowIndex > 0 && rdvDetailSectionStyles.rowBorder,
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
            <View style={styles.mapActions}>
              <View style={styles.mapBtn}>
                <Button
                  title="Carte"
                  size="sm"
                  variant="outline"
                  leftIcon={<Map size={14} color={colors.primary} strokeWidth={2} />}
                  onPress={openGoogleMaps}
                />
              </View>
              <View style={styles.mapBtn}>
                <Button
                  title="Itinéraire Waze"
                  size="sm"
                  variant="outline"
                  leftIcon={<Navigation size={14} color={colors.primary} strokeWidth={2} />}
                  onPress={openWaze}
                />
              </View>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing[1],
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  valueBlock: {
    gap: spacing[1],
  },
  value: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: fontSize.base * 1.4,
    flexShrink: 1,
  },
  complement: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.35,
  },
  mapActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    paddingTop: spacing[1],
  },
  mapBtn: {
    flexShrink: 1,
  },
});
