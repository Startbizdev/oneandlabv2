import { View } from 'react-native';
import { FilterOptionChips } from '@/components/ui/FilterOptionChips';
import { buildFieldStyles } from '@/components/ui/field-styles';
import { GENDER_OPTIONS } from '@/constants/pro-emploi';
import { AppText, useStyles } from '@/theme';

interface Props {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}

/** Même libellé et même erreur que `Input` / `SelectField`. */
export function GenderSelect({ label = 'Genre', value, onChange, error }: Props) {
  const field = useStyles(buildFieldStyles);
  return (
    <View style={field.wrapper} accessibilityLabel={label}>
      <AppText style={field.label}>{label}</AppText>
      <FilterOptionChips options={[...GENDER_OPTIONS]} value={value} onChange={onChange} />
      {error ? (
        <AppText accessibilityRole="alert" style={field.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
