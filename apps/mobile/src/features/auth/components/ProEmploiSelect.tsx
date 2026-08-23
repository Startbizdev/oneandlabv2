import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SelectField } from '@/components/ui/SelectField';
import { Input } from '@/components/ui/Input';
import {
  PRO_EMPLOI_OTHER,
  PRO_SANTE_EMPLOI_OPTIONS,
  isProEmploiComplete,
  proEmploiCustomValue,
  proEmploiSelectValue,
  resolveProEmploiForSave,
} from '@/constants/pro-emploi';
import { spacing } from '@/theme';

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  customError?: string;
}

/** Liste des professions pro + « Autre » avec saisie libre. */
export function ProEmploiSelect({
  value,
  onChange,
  label = 'Profession (emploi)',
  error,
  customError,
}: Props) {
  const [selectValue, setSelectValue] = useState(() => proEmploiSelectValue(value));
  const [customValue, setCustomValue] = useState(() => proEmploiCustomValue(value));

  useEffect(() => {
    setSelectValue(proEmploiSelectValue(value));
    setCustomValue(proEmploiCustomValue(value));
  }, [value]);

  const commit = (nextSelect: string, nextCustom: string) => {
    onChange(resolveProEmploiForSave(nextSelect, nextCustom));
  };

  return (
    <View style={{ gap: spacing[3] }}>
      <SelectField
        label={label}
        value={selectValue}
        options={PRO_SANTE_EMPLOI_OPTIONS}
        onChange={(next) => {
          setSelectValue(next);
          if (next !== PRO_EMPLOI_OTHER) {
            setCustomValue('');
            commit(next, '');
          } else {
            commit(next, customValue);
          }
        }}
        placeholder="Rechercher votre profession…"
        sheetTitle="Profession"
        error={error}
      />
      {selectValue === PRO_EMPLOI_OTHER ? (
        <Input
          label="Précisez votre profession"
          value={customValue}
          onChangeText={(text) => {
            setCustomValue(text);
            commit(PRO_EMPLOI_OTHER, text);
          }}
          placeholder="Ex. : Podologue, Orthophoniste…"
          autoCapitalize="words"
          maxLength={120}
          error={
            customError ??
            (selectValue === PRO_EMPLOI_OTHER && !isProEmploiComplete(selectValue, customValue)
              ? 'Indiquez votre profession'
              : undefined)
          }
        />
      ) : null}
    </View>
  );
}
