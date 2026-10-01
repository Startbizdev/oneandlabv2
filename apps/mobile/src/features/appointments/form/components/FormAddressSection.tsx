import { View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { Input } from '@/components/ui/Input';
import type { AddressPayload } from '../types';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';

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
  const styles = useStyles(buildStyles);

  return (
    <View style={styles.container}>
      <AppText style={styles.sectionTitle}>Adresse</AppText>
      {existingAddress ? (
        <AppText style={styles.existingAddress}>{existingAddress.label}</AppText>
      ) : null}
      <Input
        label="Adresse (libellé)"
        value={addressLabel}
        onChangeText={onChangeLabel}
        placeholder="12 rue de la Paix, Paris"
      />
      <Row gap={spacing[2]}>
        <View style={styles.coordField}>
          <Input label="Latitude" value={lat} onChangeText={onChangeLat} keyboardType="decimal-pad" />
        </View>
        <View style={styles.coordField}>
          <Input label="Longitude" value={lng} onChangeText={onChangeLng} keyboardType="decimal-pad" />
        </View>
      </Row>
      <Input label="Complément" value={complement} onChangeText={onChangeComplement} />
      <AppText style={styles.hint}>
        Saisissez l'adresse et les coordonnées GPS (comme sur le web après géolocalisation).
      </AppText>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  container: {
    gap: spacing[2],
  },
  sectionTitle: {
    ...font.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  existingAddress: {
    ...font.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  coordField: {
    minWidth: 0,
    flex: 1,
  },
  hint: {
    ...font.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
};
}
