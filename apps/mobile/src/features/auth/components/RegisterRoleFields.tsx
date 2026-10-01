import { PROFESSIONAL_ID_LABEL, isProIpaEmploi } from '@oneandlab/shared-types';
import { View } from 'react-native';
import { BirthDatePicker } from '@/components/ui/BirthDatePicker';
import { Input } from '@/components/ui/Input';
import type { RegisterRole } from '@/features/auth/api/registration.service';
import { GenderSelect } from '@/features/auth/components/GenderSelect';
import { ProEmploiSelect } from '@/features/auth/components/ProEmploiSelect';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';

const ADELI_OR_RPPS_PLACEHOLDER = '123456789 ou 12345678901';
const ADELI_OR_RPPS_HINT = '9 chiffres (Adeli) ou 11 chiffres (RPPS)';

interface Props {
  role: RegisterRole;
  birthDate: string;
  onBirthDateChange: (value: string) => void;
  gender: string;
  onGenderChange: (value: string) => void;
  professionalId: string;
  onProfessionalIdChange: (value: string) => void;
  proRpps: string;
  onProRppsChange: (value: string) => void;
  emploi: string;
  onEmploiChange: (value: string) => void;
  professionalIdError: string | null;
}

/** Champs propres au rôle : identité patient, ou identifiants professionnels (infirmier / pro). */
export function RegisterRoleFields({
  role,
  birthDate,
  onBirthDateChange,
  gender,
  onGenderChange,
  professionalId,
  onProfessionalIdChange,
  proRpps,
  onProRppsChange,
  emploi,
  onEmploiChange,
  professionalIdError,
}: Props) {
  const styles = useStyles(buildStyles);

  if (role === 'patient') {
    return (
      <View style={styles.group}>
        <BirthDatePicker value={birthDate} onChange={onBirthDateChange} />
        <GenderSelect value={gender} onChange={onGenderChange} />
        <AppText style={styles.help}>
          Votre date de naissance et votre genre aident le soignant à préparer votre prise en charge.
        </AppText>
      </View>
    );
  }

  if (role === 'nurse') {
    return (
      <>
        <GenderSelect value={gender} onChange={onGenderChange} label="Genre" />
        <Input
          label={PROFESSIONAL_ID_LABEL}
          value={professionalId}
          onChangeText={onProfessionalIdChange}
          keyboardType="number-pad"
          maxLength={11}
          placeholder={ADELI_OR_RPPS_PLACEHOLDER}
          hint={ADELI_OR_RPPS_HINT}
          error={professionalIdError ?? undefined}
        />
      </>
    );
  }

  if (role !== 'pro') return null;

  const isProIpa = isProIpaEmploi(emploi);
  const rppsHint = emploi.trim() === 'Autre' ? 'Facultatif pour la catégorie Autre' : '11 chiffres';

  return (
    <>
      <ProEmploiSelect value={emploi} onChange={onEmploiChange} />
      {isProIpa ? <GenderSelect value={gender} onChange={onGenderChange} label="Genre" /> : null}
      <Input
        label={isProIpa ? PROFESSIONAL_ID_LABEL : 'Numéro RPPS'}
        value={proRpps}
        onChangeText={onProRppsChange}
        keyboardType="number-pad"
        maxLength={11}
        placeholder={isProIpa ? ADELI_OR_RPPS_PLACEHOLDER : '12345678901'}
        hint={isProIpa ? ADELI_OR_RPPS_HINT : rppsHint}
        error={professionalIdError ?? undefined}
      />
    </>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    group: {
      gap: spacing[2],
    },
    help: {
      ...font.regular,
      fontSize: fontSize.xs,
      lineHeight: fontSize.xs * 1.5,
      color: c.textTertiary,
    },
  };
}
