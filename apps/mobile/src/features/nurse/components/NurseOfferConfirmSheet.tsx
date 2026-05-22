import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  visible: boolean;
  loading?: boolean;
  batchCount?: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function NurseOfferConfirmSheet({
  visible,
  loading,
  batchCount = 1,
  onClose,
  onConfirm,
}: Props) {
  const [terms, setTerms] = useState(false);

  const title = batchCount > 1 ? `Accepter ${batchCount} soins` : 'Accepter la demande';
  const lead =
    batchCount > 1
      ? `Vous confirmez la prise en charge de ${batchCount} soins de ce lot.`
      : 'Vous confirmez la prise en charge de ce rendez-vous.';

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        setTerms(false);
        onClose();
      }}
      title={title}
      footer={
        <View style={styles.footer}>
          <Button title="Annuler" variant="outline" onPress={onClose} fullWidth />
          <Button
            title="Confirmer"
            loading={loading}
            disabled={!terms}
            onPress={onConfirm}
            fullWidth
          />
        </View>
      }
    >
      <Text style={styles.lead}>{lead}</Text>
      <View style={styles.termsRow}>
        <Switch
          value={terms}
          onValueChange={setTerms}
          trackColor={{ false: colors.border, true: colors.primaryMid }}
          thumbColor={terms ? colors.primary : colors.surface}
        />
        <Text style={styles.termsText}>
          J’accepte la prise en charge et m’engage à respecter la confidentialité du patient.
        </Text>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  lead: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.45,
    marginBottom: spacing[3],
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  termsText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: fontSize.sm * 1.45,
  },
  footer: { gap: spacing[2] },
});
