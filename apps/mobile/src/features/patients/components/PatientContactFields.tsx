import { Input } from '@/components/ui/Input';

export type PatientContactValues = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

export const EMPTY_PATIENT_CONTACT: PatientContactValues = { firstName: '', lastName: '', phone: '', email: '' };

type Props = {
  values: PatientContactValues;
  phoneOptional: boolean;
  onChange: (patch: Partial<PatientContactValues>) => void;
};

/** Identité et contact d'un nouveau patient, avec les indices d'AutoFill iOS / Android. */
export function PatientContactFields({ values, phoneOptional, onChange }: Props) {
  return (
    <>
      <Input
        label="Prénom"
        value={values.firstName}
        onChangeText={(firstName) => onChange({ firstName })}
        autoCapitalize="words"
        textContentType="givenName"
        autoComplete="name-given"
      />
      <Input
        label="Nom"
        value={values.lastName}
        onChangeText={(lastName) => onChange({ lastName })}
        autoCapitalize="words"
        textContentType="familyName"
        autoComplete="name-family"
      />
      <Input
        label={phoneOptional ? 'Téléphone (optionnel)' : 'Téléphone'}
        value={values.phone}
        onChangeText={(phone) => onChange({ phone })}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
      />
      <Input
        label="Email (optionnel)"
        value={values.email}
        onChangeText={(email) => onChange({ email })}
        keyboardType="email-address"
        autoCapitalize="none"
        textContentType="emailAddress"
        autoComplete="email"
      />
    </>
  );
}
