import { StyleSheet, Text, View } from 'react-native';
import { UserCheck } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import type { PatientRow } from '@/features/patients/api/fetch-all-patients';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  visible: boolean;
  patient: PatientRow | null;
  onDismiss: () => void;
  onUseExisting: () => void;
}

export function PatientDuplicateSheet({ visible, patient, onDismiss, onUseExisting }: Props) {
  const name = patient
    ? `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim()
    : '';

  return (
    <BottomSheet visible={visible} onClose={onDismiss} title="Patient déjà enregistré">
      <View style={styles.body}>
        <UserCheck size={32} color={colors.primary} strokeWidth={2} />
        <Text style={styles.text}>
          Un dossier existe déjà pour ce contact
          {name ? ` (${name})` : ''}. Souhaitez-vous l’utiliser pour ce rendez-vous ?
        </Text>
      </View>
      <View style={styles.footer}>
        <Button title="Continuer en nouveau" variant="outline" onPress={onDismiss} fullWidth />
        <Button title="Utiliser ce patient" onPress={onUseExisting} fullWidth />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: spacing[3], paddingVertical: spacing[2] },
  text: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.5,
  },
  footer: { gap: spacing[2], marginTop: spacing[2] },
});
