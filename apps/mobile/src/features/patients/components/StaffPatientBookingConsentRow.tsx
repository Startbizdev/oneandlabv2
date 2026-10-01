import { Pressable, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { STAFF_PATIENT_BOOKING_CONSENT_LABEL } from '@oneandlab/shared-constants';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';

type Props = {
  checked: boolean;
  onToggle: () => void;
  error?: boolean;
};

export function StaffPatientBookingConsentRow({ checked, onToggle, error }: Props) {
  const styles = useStyles(buildStyles);

  return (
    <Pressable
      onPress={onToggle}
      style={[styles.consentRow, error && styles.consentRowError]}
    >
      <Row align="start" gap={spacing[3]}>
        <View style={[styles.checkbox, checked && styles.checkboxActive]}>
          {checked ? <AppText style={styles.checkmark}>✓</AppText> : null}
        </View>
        <AppText style={styles.consentText}>{STAFF_PATIENT_BOOKING_CONSENT_LABEL}</AppText>
      </Row>
    </Pressable>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    consentRow: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: spacing[3],
      backgroundColor: c.surface,
    },
    consentRowError: {
      borderColor: c.error,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginTop: 2,
    },
    checkboxActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    checkmark: {
      color: c.textInverse,
      fontSize: fontSize.sm,
      ...font.semiBold,
      lineHeight: 16,
    },
    consentText: {
      minWidth: 0,
      flex: 1,
      fontSize: fontSize.sm,
      ...font.medium,
      color: c.textPrimary,
      lineHeight: 20,
    },
  };
}
