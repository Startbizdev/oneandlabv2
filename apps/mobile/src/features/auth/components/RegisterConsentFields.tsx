import { View } from 'react-native';
import type { RegisterRole } from '@/features/auth/api/registration.service';
import { ConsentCheckbox } from '@/features/auth/components/ConsentCheckbox';
import { LegalLinks } from '@/features/auth/components/LegalLinks';
import { spacing, useStyles } from '@/theme';

interface Props {
  role: RegisterRole;
  acceptTerms: boolean;
  onAcceptTermsChange: (value: boolean) => void;
  acceptHealthData: boolean;
  onAcceptHealthDataChange: (value: boolean) => void;
}

/**
 * Consentements demandés à l'inscription. Le backend ne stocke aucune preuve de consentement :
 * ces cases bloquent seulement l'envoi côté app.
 */
export function RegisterConsentFields({
  role,
  acceptTerms,
  onAcceptTermsChange,
  acceptHealthData,
  onAcceptHealthDataChange,
}: Props) {
  const styles = useStyles(buildStyles);

  return (
    <View style={styles.group}>
      <ConsentCheckbox
        checked={acceptTerms}
        onToggle={onAcceptTermsChange}
        label="J’accepte les conditions d’utilisation et la politique de confidentialité de Cary."
      />
      {role === 'patient' ? (
        <ConsentCheckbox
          checked={acceptHealthData}
          onToggle={onAcceptHealthDataChange}
          label="J’accepte que Cary traite mes données de santé pour organiser mes soins à domicile et les partage avec les professionnels de santé qui me prennent en charge."
        />
      ) : null}
      <LegalLinks />
    </View>
  );
}

function buildStyles() {
  return {
    group: {
      gap: spacing[2],
    },
  };
}
