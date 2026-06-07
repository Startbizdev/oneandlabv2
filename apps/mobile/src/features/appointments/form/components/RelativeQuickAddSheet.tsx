import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BirthDatePicker } from '@/components/ui/BirthDatePicker';
import {
  createPatientRelative,
  type PatientRelative,
} from '@/features/patient-relatives/api/patient-relatives.service';
import { GenderSelect } from '@/features/auth/components/GenderSelect';
import { RELATIONSHIP_OPTIONS } from '@/features/patient-relatives/constants/relationship-types';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (id: string, relative?: PatientRelative) => void;
}

export function RelativeQuickAddSheet({ visible, onClose, onCreated }: Props) {
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [relationshipType, setRelationshipType] = useState('child');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');

  const reset = () => {
    setFirstName('');
    setLastName('');
    setRelationshipType('child');
    setBirthDate('');
    setGender('');
  };

  const mut = useMutation({
    mutationFn: async () => {
      if (!firstName.trim() || !lastName.trim()) {
        throw new Error('Prénom et nom obligatoires');
      }
      if (!gender.trim()) {
        throw new Error('Le genre est obligatoire');
      }
      const res = await createPatientRelative({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        relationship_type: relationshipType,
        birth_date: birthDate || undefined,
        gender: gender || undefined,
      });
      if (!res.success || !res.data?.id) throw new Error(res.error ?? 'Création impossible');
      return res.data;
    },
    onSuccess: (relative) => {
      toast('Proche ajouté', { type: 'success' });
      void qc.invalidateQueries({ queryKey: ['patient-relatives'] });
      reset();
      onCreated(relative.id, relative);
      onClose();
    },
    onError: (e) => handleApiError(e, toast, 'createRelative'),
  });

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Ajouter un proche"
    >
      <View style={styles.fields}>
        <Input label="Prénom" value={firstName} onChangeText={setFirstName} />
        <Input label="Nom" value={lastName} onChangeText={setLastName} />
        <View>
          <Text style={styles.label}>Lien de parenté</Text>
          <View style={styles.pills}>
            {RELATIONSHIP_OPTIONS.map((o) => {
              const active = relationshipType === o.value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => setRelationshipType(o.value)}
                  style={[styles.pill, active && styles.pillActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={o.label}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <GenderSelect value={gender} onChange={setGender} />
        <BirthDatePicker value={birthDate} onChange={setBirthDate} />
      </View>
      <Button
        title="Enregistrer le proche"
        loading={mut.isPending}
        onPress={() => mut.mutate()}
        fullWidth
      />
    </BottomSheet>
  );
}

function buildStyles(c: AppColors) {
  return {
  fields: { gap: spacing[3] },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
    marginBottom: spacing[2],
    lineHeight: fontSize.base * 1.3,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  pill: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  pillActive: {
    borderColor: c.primary,
    backgroundColor: c.primaryLight,
  },
  pillText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.35,
  },
  pillTextActive: {
    color: c.primary,
    fontFamily: fontFamily.semiBold,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_form_components_RelativeQuickAddSheet_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
