import { SelectField } from '@/components/ui/SelectField';
import { PRO_SANTE_EMPLOI_OPTIONS } from '@/constants/pro-emploi';

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
}

/** Liste fermée des professions pro — parité web (USelectMenu). */
export function ProEmploiSelect({
  value,
  onChange,
  label = 'Profession (emploi)',
  error,
}: Props) {
  return (
    <SelectField
      label={label}
      value={value}
      options={PRO_SANTE_EMPLOI_OPTIONS}
      onChange={onChange}
      placeholder="Rechercher votre profession…"
      sheetTitle="Profession"
      error={error}
    />
  );
}
