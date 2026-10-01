import { useState } from 'react';
import { View } from 'react-native';
import { FilterOptionChips } from '@/components/ui/FilterOptionChips';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SheetModal } from '@/components/ui/SheetModal';
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
import { THIRD_PARTY_NAME_INPUT } from '../constants/third-party-input-props';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { spacing, AppText, useStyles } from '@/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (id: string, relative?: PatientRelative) => void;
  patientId?: string;
  staffConsent?: boolean;
}

export function RelativeQuickAddSheet({ visible, onClose, onCreated, patientId, staffConsent }: Props) {
  const styles = useStyles(buildStyles);
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
        ...(patientId ? { patient_id: patientId } : {}),
        ...(staffConsent ? { patient_booking_consent: true } : {}),
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
    <SheetModal
      visible={visible}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Ajouter un proche"
      footer={
        <Button
          title="Enregistrer le proche"
          size="lg"
          loading={mut.isPending}
          onPress={() => mut.mutate()}
          fullWidth
        />
      }
    >
      <View style={styles.fields}>
        <Input label="Prénom" value={firstName} onChangeText={setFirstName} {...THIRD_PARTY_NAME_INPUT} />
        <Input label="Nom" value={lastName} onChangeText={setLastName} {...THIRD_PARTY_NAME_INPUT} />
        <View style={styles.group}>
          <AppText variant="headline">Lien de parenté</AppText>
          <FilterOptionChips
            options={[...RELATIONSHIP_OPTIONS]}
            value={relationshipType}
            onChange={setRelationshipType}
          />
        </View>
        <GenderSelect value={gender} onChange={setGender} />
        <BirthDatePicker value={birthDate} onChange={setBirthDate} />
      </View>
    </SheetModal>
  );
}

function buildStyles() {
  return {
    fields: { gap: spacing[3] },
    group: { gap: spacing[2] },
  };
}

