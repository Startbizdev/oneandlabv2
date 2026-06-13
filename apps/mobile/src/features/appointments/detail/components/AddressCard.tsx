import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import React, { useCallback } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { MapPin, ExternalLink } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { Cluster } from '@/components/layout/primitives';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  resolveAppointmentDetailAddressLine,
  resolveAppointmentMapCoords,
} from '../utils/appointment-address-display';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function AddressCard({
  apt,
  wazePreferred,
} : {
  apt: Appointment;
  wazePreferred?: boolean;
}) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_AddressCard_tsx_AddressCard_styles');

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
      <Cluster
        gap={spacing[3]}
        align="start"
        style={styles.addressRow}
        leading={
          <View style={styles.iconWrap}>
            <MapPin size={16} color={c.primary} strokeWidth={2} />
          </View>
        }
      >
        <Animated.Text style={styles.addressText}>{label}</Animated.Text>
      </Cluster>
      <View style={styles.action}>
        <Button
          title={wazePreferred ? 'Itinéraire Waze' : 'Ouvrir dans Maps'}
          variant="outline"
          size="sm"
          rightIcon={<ExternalLink size={13} color={c.primary} strokeWidth={2} />}
          onPress={openMaps}
        />
      </View>
    </Card>
  );
}

function buildStyles(c: AppColors) {
  return {
  addressRow: {
    marginBottom: spacing[3],
  },
  iconWrap: {
    marginTop: 2,
  },
  addressText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: c.textPrimary,
    lineHeight: fontSize.base * 1.5,
  },
  action: {
    alignSelf: 'flex-start' as const,
  },
};
}
