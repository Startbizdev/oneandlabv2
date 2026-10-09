import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, Plus, Trash2 } from 'lucide-react-native';
import { PATIENT_PHONE_LABELS, type PatientPhone, type PatientPhoneLabel } from '@oneandlab/shared-types';
import { formatFrenchPhoneDisplay } from '@oneandlab/shared-utils';
import { Button } from '@/components/ui/Button';
import { FilterOptionChips } from '@/components/ui/FilterOptionChips';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { Input } from '@/components/ui/Input';
import { SettingsSection } from '@/components/ui/SettingsSection';
import type { SettingsRowProps } from '@/components/ui/SettingsRow';
import { SheetModal } from '@/components/ui/SheetModal';
import { Stack } from '@/components/layout/primitives';
import { getErrorMessage } from '@/lib/errors/handle-api-error';
import { queryKeys } from '@/lib/query-keys';
import { ICON_STROKE_WIDTH, AppText, iconSize, spacing, useAppColors, useStyles, type Theme } from '@/theme';
import { addPatientPhone, deletePatientPhone, fetchPatientPhones } from '../api/patient-phones.service';

type Props = {
  patientId: string;
  canEdit: boolean;
  onCall: (phone: string) => void;
};

const labelFr = (label: PatientPhoneLabel) =>
  PATIENT_PHONE_LABELS.find((item) => item.value === label)?.label_fr ?? 'Autre';

/** Numéros en plus du téléphone principal : appel au toucher, ajout et suppression pour l'équipe soignante. */
export function PatientPhonesSection({ patientId, canEdit, onCall }: Props) {
  const c = useAppColors();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [toDelete, setToDelete] = useState<PatientPhone | null>(null);

  const phonesQ = useQuery({
    queryKey: queryKeys.patients.phones(patientId),
    queryFn: () => fetchPatientPhones(patientId),
    enabled: Boolean(patientId),
  });

  const deleteMut = useMutation({
    mutationFn: (phoneId: string) => deletePatientPhone(patientId, phoneId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.patients.phones(patientId) });
      setToDelete(null);
    },
  });

  const phones = phonesQ.data ?? [];
  if (phonesQ.isLoading || (!canEdit && phones.length === 0 && !phonesQ.isError)) return null;

  const items: SettingsRowProps[] = phonesQ.isError
    ? [
        {
          icon: Phone,
          label: 'Numéros indisponibles',
          description: 'Toucher pour réessayer',
          inlineAction: true,
          onPress: () => void phonesQ.refetch(),
        },
      ]
    : phones.map((entry) => ({
        icon: Phone,
        label: formatFrenchPhoneDisplay(entry.phone),
        description: labelFr(entry.label),
        inlineAction: true,
        accessibilityHint: 'Appeler ce numéro',
        onPress: () => onCall(entry.phone),
        ...(canEdit
          ? {
              trailing: (
                <IconActionButton
                  label={`Supprimer le numéro ${labelFr(entry.label)}`}
                  variant="ghost"
                  onPress={() => setToDelete(entry)}
                >
                  <Trash2 size={iconSize.sm} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
                </IconActionButton>
              ),
            }
          : {}),
      }));

  if (canEdit && !phonesQ.isError) {
    items.push({ icon: Plus, label: 'Ajouter un numéro', inlineAction: true, onPress: () => setAddOpen(true) });
  }

  return (
    <>
      <SettingsSection title="Autres numéros" items={items} />

      <AddPatientPhoneSheet visible={addOpen} patientId={patientId} onClose={() => setAddOpen(false)} />

      <SheetModal
        visible={toDelete !== null}
        onClose={() => setToDelete(null)}
        dismissible={!deleteMut.isPending}
        title="Supprimer ce numéro ?"
        subtitle={toDelete ? `${labelFr(toDelete.label)} · ${formatFrenchPhoneDisplay(toDelete.phone)}` : undefined}
        footer={
          <Stack gap={spacing[2]}>
            <Button
              title="Supprimer"
              variant="destructive"
              size="lg"
              fullWidth
              loading={deleteMut.isPending}
              onPress={() => toDelete && deleteMut.mutate(toDelete.id)}
            />
            <Button title="Annuler" variant="ghost" fullWidth onPress={() => setToDelete(null)} />
          </Stack>
        }
      >
        {deleteMut.error ? <ErrorText message={getErrorMessage(deleteMut.error)} /> : null}
      </SheetModal>
    </>
  );
}

function AddPatientPhoneSheet({
  visible,
  patientId,
  onClose,
}: {
  visible: boolean;
  patientId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [label, setLabel] = useState<PatientPhoneLabel>('mobile');
  const [phone, setPhone] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();

  const addMut = useMutation({
    mutationFn: () => addPatientPhone(patientId, { label, phone: phone.trim() }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.patients.phones(patientId) });
      onClose();
    },
  });
  const { reset } = addMut;

  useEffect(() => {
    if (!visible) return;
    setLabel('mobile');
    setPhone('');
    setFieldError(undefined);
    reset();
  }, [visible, reset]);

  const submit = () => {
    if (!phone.trim()) {
      setFieldError('Saisissez un numéro.');
      return;
    }
    addMut.mutate();
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      dismissible={!addMut.isPending}
      title="Ajouter un numéro"
      footer={<Button title="Ajouter" size="lg" fullWidth loading={addMut.isPending} onPress={submit} />}
    >
      <Stack gap={spacing[4]}>
        <FilterOptionChips
          options={PATIENT_PHONE_LABELS.map((item) => ({ value: item.value, label: item.label_fr }))}
          value={label}
          onChange={setLabel}
        />
        <Input
          label="Numéro"
          value={phone}
          onChangeText={(v) => {
            setPhone(v);
            setFieldError(undefined);
          }}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          placeholder="06 12 34 56 78"
          error={fieldError}
        />
        {addMut.error ? <ErrorText message={getErrorMessage(addMut.error)} /> : null}
      </Stack>
    </SheetModal>
  );
}

function ErrorText({ message }: { message: string }) {
  const styles = useStyles(buildStyles);
  return (
    <AppText variant="body" style={styles.error} accessibilityRole="alert">
      {message}
    </AppText>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    error: { color: c.error },
  };
}
