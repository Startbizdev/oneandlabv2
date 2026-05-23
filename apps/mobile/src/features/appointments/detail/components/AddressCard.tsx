import React, { useCallback } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { MapPin, ExternalLink } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  resolveAppointmentDetailAddressLine,
  resolveAppointmentMapCoords,
} from '../utils/appointment-address-display';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function AddressCard({
  apt,
  wazePreferred,
}: {
  apt: Appointment;
  wazePreferred?: boolean;
}) {
  const label = resolveAppointmentDetailAddressLine(apt);
  const coords = resolveAppointmentMapCoords(apt);

  const openMaps = useCallback(() => {
    if (wazePreferred) {
      if (coords) {
        void Linking.openURL(
          `https://waze.com/ul?ll=${coords.lat},${coords.lng}&navigate=yes`,
        );
        return;
      }
      if (label) {
        void Linking.openURL(`https://waze.com/ul?q=${encodeURIComponent(label)}&navigate=yes`);
      }
      return;
    }
    if (coords) {
      void Linking.openURL(`https://www.google.com/maps?q=${coords.lat},${coords.lng}`);
      return;
    }
    if (label) {
      void Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`,
      );
    }
  }, [coords, label, wazePreferred]);

  if (!label) return null;

  return (
    <Card shadow="sm" padding="md">
      <View style={styles.addressRow}>
        <View style={styles.iconWrap}>
          <MapPin size={16} color={colors.primary} strokeWidth={2} />
        </View>
        <Animated.Text style={styles.addressText}>{label}</Animated.Text>
      </View>
      <View style={styles.action}>
        <Button
          title={wazePreferred ? 'Itinéraire Waze' : 'Ouvrir dans Maps'}
          variant="outline"
          size="sm"
          rightIcon={<ExternalLink size={13} color={colors.primary} strokeWidth={2} />}
          onPress={openMaps}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  addressRow: {
    flexDirection: 'row',
    gap: spacing[3],
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  iconWrap: {
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: fontSize.base * 1.5,
  },
  action: {
    alignSelf: 'flex-start',
  },
});
