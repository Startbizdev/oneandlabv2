import React, { useCallback } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { MapPin, ExternalLink } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function AddressCard({
  address,
  wazePreferred,
}: {
  address: string;
  wazePreferred?: boolean;
}) {
  const label = address.startsWith('{')
    ? ((JSON.parse(address) as { label?: string }).label ?? address)
    : address;

  const openMaps = useCallback(() => {
    try {
      const parsed = JSON.parse(address) as { lat?: number; lng?: number; label?: string };
      if (wazePreferred) {
        if (parsed.lat != null && parsed.lng != null) {
          void Linking.openURL(
            `https://waze.com/ul?ll=${parsed.lat},${parsed.lng}&navigate=yes`,
          );
          return;
        }
        const q = parsed.label ?? label;
        void Linking.openURL(`https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes`);
        return;
      }
      if (parsed.lat && parsed.lng) {
        void Linking.openURL(`https://www.google.com/maps?q=${parsed.lat},${parsed.lng}`);
        return;
      }
      if (parsed.label) {
        void Linking.openURL(
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parsed.label)}`,
        );
      }
    } catch {
      void Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
      );
    }
  }, [address, label, wazePreferred]);

  return (
    <Card shadow="sm" padding="md">
      <View style={styles.addressRow}>
        <View style={styles.iconWrap}>
          <MapPin size={16} color={colors.primary} strokeWidth={2} />
        </View>
        <Animated.Text style={styles.addressText} numberOfLines={3}>
          {label}
        </Animated.Text>
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
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    lineHeight: fontSize.base * 1.5,
  },
  action: {
    alignSelf: 'flex-start',
  },
});
