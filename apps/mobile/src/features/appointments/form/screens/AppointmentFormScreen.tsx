import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { FormScreen } from '@/components/layout/FormScreen';
import { Button } from '@/components/ui/Button';
import { AddressAutocomplete } from '@/features/address/components/AddressAutocomplete';
import { FormPatientSection } from '../components/FormPatientSection';
import { FormScheduleSection } from '../components/FormScheduleSection';
import { FormCareFieldsSection } from '../components/FormCareFieldsSection';
import { FormDocumentsSection } from '../components/FormDocumentsSection';
import { CategoryPicker } from '../components/CategoryPicker';
import { useAppointmentForm } from '../hooks/useAppointmentForm';
import { NEW_PATIENT_ID } from '../types';

interface Props {
  mode: 'create' | 'edit';
  appointmentId?: string;
  role: string;
  basePath: string;
  defaultType?: string;
  patientEmailOptional?: boolean;
}

export function AppointmentFormScreen(props: Props) {
  const f = useAppointmentForm(props);

  if (f.loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FormScreen contentContainerStyle={styles.content} backgroundColor={colors.background}>
      <FormPatientSection
        patients={f.patientOptions}
        patientMode={
          f.selectedPatientId && f.selectedPatientId !== NEW_PATIENT_ID ? 'existing' : 'new'
        }
        onPatientModeChange={(m) => {
          if (m === 'new') f.onSelectPatient(NEW_PATIENT_ID);
        }}
        selectedPatientId={f.selectedPatientId || NEW_PATIENT_ID}
        onSelectPatient={f.onSelectPatient}
        firstName={f.values.first_name}
        lastName={f.values.last_name}
        email={f.values.email}
        phone={f.values.phone}
        gender={f.values.gender}
        birthDate={f.values.birth_date}
        onChange={f.setField}
        emailOptional={props.patientEmailOptional}
      />

      <CategoryPicker
        categories={f.categories}
        selectedId={f.values.category_id}
        onSelect={f.onSelectCategory}
      />

      <AddressAutocomplete
        value={f.values.address}
        complement={f.addressComplement}
        onChange={f.onAddressChange}
        onComplementChange={f.onComplementChange}
        error={f.errors.address?.message}
      />

      <FormScheduleSection
        scheduledAt={f.values.scheduled_at}
        serviceType={f.values.type}
        availabilityType={f.values.availability_type}
        range={f.values.availability_range}
        onScheduledAt={(v) => f.setField('scheduled_at', v)}
        onAvailabilityType={(t) => f.setValue('availability_type', t)}
        onRange={(r) => f.setValue('availability_range', r)}
      />

      <FormCareFieldsSection
        type={f.values.type}
        bloodTestType={f.values.blood_test_type}
        durationDays={f.values.duration_days}
        customDays={f.values.custom_days}
        frequency={f.values.frequency}
        preferredNurseGender={f.values.preferred_nurse_gender}
        notes={f.values.notes}
        onChange={f.setField}
      />

      <FormDocumentsSection
        files={f.values.files ?? {}}
        onPick={(key, file) =>
          f.setValues((prev) => ({
            ...prev,
            files: { ...(prev.files ?? {}), [key]: file },
          }))
        }
      />

      <Button
        title={f.saving ? 'Enregistrement…' : 'Enregistrer'}
        onPress={f.submit}
        disabled={f.saving}
        fullWidth
        size="lg"
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[10],
    gap: spacing[5],
  },
});
