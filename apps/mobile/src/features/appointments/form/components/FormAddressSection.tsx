import { StyleSheet, Text, View } from 'react-native';
import { Input } from '@/components/ui/Input';
import type { AddressPayload } from '../types';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  addressLabel: string;
  lat: string;
  lng: string;
  complement: string;
  onChangeLabel: (v: string) => void;
  onChangeLat: (v: string) => void;
  onChangeLng: (v: string) => void;
  onChangeComplement: (v: string) => void;
  existingAddress?: AddressPayload | null;
}

export function FormAddressSection({
  addressLabel,
  lat,
  lng,
  complement,
  onChangeLabel,
  onChangeLat,
  onChangeLng,
  onChangeComplement,
  existingAddress,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Adresse</Text>
      {existingAddress ? (
        <Text style={styles.existingAddress}>{existingAddress.label}</Text>
      ) : null}
      <Input
        label="Adresse (libellé)"
        value={addressLabel}
        onChangeText={onChangeLabel}
        placeholder="12 rue de la Paix, Paris"
      />
      <View style={styles.coordRow}>
        <View style={styles.coordField}>
          <Input label="Latitude" value={lat} onChangeText={onChangeLat} keyboardType="decimal-pad" />
        </View>
        <View style={styles.coordField}>
          <Input label="Longitude" value={lng} onChangeText={onChangeLng} keyboardType="decimal-pad" />
        </View>
      </View>
      <Input label="Complément" value={complement} onChangeText={onChangeComplement} />
      <Text style={styles.hint}>
        Saisissez l'adresse et les coordonnées GPS (comme sur le web après géolocalisation).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  existingAddress: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  coordRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  coordField: {
    flex: 1,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
});
