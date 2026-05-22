import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BirthDatePicker } from '@/components/ui/BirthDatePicker';
import { createPatientRelative } from '@/features/patient-relatives/api/patient-relatives.service';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { colors, spacing } from '@/theme';

const RELATIONSHIPS = [
  'Conjoint(e)',
  'Enfant',
  'Parent',
  'Frère / Sœur',
  'Autre proche',
] as const;

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export function RelativeQuickAddSheet({ visible, onClose, onCreated }: Props) {
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [relationship, setRelationship] = useState<string>(RELATIONSHIPS[0]);
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');

  const reset = () => {
    setFirstName('');
    setLastName('');
    setRelationship(RELATIONSHIPS[0]);
    setBirthDate('');
    setGender('');
  };

  const mut = useMutation({
    mutationFn: async () => {
      if (!firstName.trim() || !lastName.trim()) {
        throw new Error('Prénom et nom obligatoires');
      }
      const res = await createPatientRelative({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        relationship_type: relationship,
        birth_date: birthDate || undefined,
        gender: gender || undefined,
      });
      if (!res.success || !res.data?.id) throw new Error(res.error ?? 'Création impossible');
      return res.data.id;
    },
    onSuccess: (id) => {
      toast('Proche ajouté', { type: 'success' });
      void qc.invalidateQueries({ queryKey: ['patient-relatives'] });
      reset();
      onCreated(id);
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
      footer={
        <Button
          title="Enregistrer le proche"
          loading={mut.isPending}
          onPress={() => mut.mutate()}
          fullWidth
        />
      }
    >
      <View style={styles.fields}>
        <Input label="Prénom" value={firstName} onChangeText={setFirstName} />
        <Input label="Nom" value={lastName} onChangeText={setLastName} />
        <Input
          label="Lien de parenté"
          value={relationship}
          onChangeText={setRelationship}
          placeholder={RELATIONSHIPS[0]}
        />
        <Input label="Genre (M/F)" value={gender} onChangeText={setGender} />
        <BirthDatePicker value={birthDate} onChange={setBirthDate} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing[3] },
});
