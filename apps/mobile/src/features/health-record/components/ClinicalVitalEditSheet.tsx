import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { FilterOptionChips } from '@/components/ui/FilterOptionChips';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ClinicalVitalContext,
  ClinicalVitalReading,
  ClinicalVitalType,
} from '@oneandlab/shared-types';
import { CLINICAL_VITAL_UI } from '@oneandlab/shared-types';
import { SheetModal } from '@/components/ui/SheetModal';
import { Button } from '@/components/ui/Button';
import { Stack } from '@/components/layout/primitives';
import { IsoDatePicker } from '@/features/nurse-passage/components/IsoDatePicker';
import { PassageTimePicker } from '@/features/nurse-passage/components/PassageTimePicker';
import {
  clinicalVitalsQueryKey,
  createClinicalVital,
  deleteClinicalVital,
  updateClinicalVital,
} from '../api/clinical-vitals.service';
import { validateClinicalVital, type ClinicalVitalFieldErrors } from '../utils/clinical-vital-bounds';
import { getErrorMessage } from '@/lib/errors/handle-api-error';
import { spacing, AppText, useStyles, type Theme } from '@/theme';

type Props = {
  visible: boolean;
  patientId: string;
  reading?: ClinicalVitalReading | null;
  /** Mesure choisie depuis sa ligne : saisie directe, sans puces de type. */
  initialType?: ClinicalVitalType | null;
  context?: ClinicalVitalContext;
  onClose: () => void;
  onDismissed?: () => void;
  onShowHistory?: () => void;
};

type FieldErrors = ClinicalVitalFieldErrors & { recordedAt?: string };

export function ClinicalVitalEditSheet({
  visible,
  patientId,
  reading,
  initialType,
  context,
  onClose,
  onDismissed,
  onShowHistory,
}: Props) {
  const styles = useStyles(buildStyles);
  const qc = useQueryClient();

  const isEdit = Boolean(reading?.id);
  const showTypeChips = !isEdit && !initialType;
  const [vitalType, setVitalType] = useState<ClinicalVitalType>('heart_rate');
  const [value, setValue] = useState('');
  const [valueSecondary, setValueSecondary] = useState('');
  const [notes, setNotes] = useState('');
  const [recordedDate, setRecordedDate] = useState('');
  const [recordedTime, setRecordedTime] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const config = useMemo(() => CLINICAL_VITAL_UI.find((x) => x.type === vitalType), [vitalType]);

  useEffect(() => {
    if (!visible) return;
    const type = reading?.vital_type ?? initialType ?? 'heart_rate';
    const recordedAt = reading ? dayjs(reading.recorded_at) : dayjs();
    setVitalType(type);
    setValue(reading ? String(reading.value) : '');
    setValueSecondary(
      reading?.value_secondary != null ? String(reading.value_secondary) : '',
    );
    setNotes(reading?.notes ?? '');
    setRecordedDate(recordedAt.format('YYYY-MM-DD'));
    setRecordedTime(recordedAt.format('HH:mm'));
    setErrors({});
    setConfirmDelete(false);
  }, [visible, reading, initialType]);

  const invalidateVitals = () => {
    void qc.invalidateQueries({ queryKey: clinicalVitalsQueryKey(patientId) });
    void qc.invalidateQueries({ queryKey: ['clinical-vitals-history', patientId] });
  };

  const saveMut = useMutation({
    mutationFn: async (parsed: { value: number; valueSecondary: number | null; recordedAt: string }) => {
      const payload = {
        vital_type: vitalType,
        value: parsed.value,
        notes: notes.trim() || null,
        recorded_at: parsed.recordedAt,
        ...(parsed.valueSecondary !== null ? { value_secondary: parsed.valueSecondary } : {}),
        ...(context
          ? { context_type: context.type, context_id: context.id ?? null }
          : {}),
      };
      if (isEdit && reading) {
        return updateClinicalVital(patientId, reading.id, payload);
      }
      return createClinicalVital(patientId, payload);
    },
    onSuccess: () => {
      invalidateVitals();
      onClose();
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => {
      if (!reading?.id) throw new Error('Constante introuvable');
      return deleteClinicalVital(patientId, reading.id);
    },
    onSuccess: () => {
      invalidateVitals();
      onClose();
    },
  });

  const onSave = () => {
    const unit = config?.unit ?? '';
    const result = validateClinicalVital(vitalType, unit, value, valueSecondary, Boolean(config?.has_secondary));
    const recordedAt = dayjs(`${recordedDate}T${recordedTime}`);
    const recordedAtError = !recordedAt.isValid()
      ? 'Choisissez la date et l’heure de la mesure.'
      : recordedAt.isAfter(dayjs())
        ? 'L’heure de mesure ne peut pas être dans le futur.'
        : undefined;
    if (!result.ok || recordedAtError) {
      setErrors({ ...(result.ok ? {} : result.errors), recordedAt: recordedAtError });
      return;
    }
    setErrors({});
    saveMut.mutate({
      value: result.value,
      valueSecondary: result.valueSecondary,
      recordedAt: recordedAt.format(),
    });
  };

  const selectType = (type: ClinicalVitalType) => {
    setVitalType(type);
    setErrors({});
  };

  const changeRecordedAt = (next: { date?: string; time?: string }) => {
    if (next.date !== undefined) setRecordedDate(next.date);
    if (next.time !== undefined) setRecordedTime(next.time);
    setErrors((e) => ({ ...e, recordedAt: undefined }));
  };

  const busy = saveMut.isPending || deleteMut.isPending;
  const typeLabel = config?.label_fr ?? 'Constante';
  const title = showTypeChips ? 'Nouvelle mesure' : typeLabel;
  const subtitle = isEdit ? 'Modifier la mesure' : showTypeChips ? undefined : 'Nouvelle mesure';

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      onDismissed={onDismissed}
      dismissible={!busy}
      title={title}
      subtitle={subtitle}
      footer={
        confirmDelete ? (
          <Stack gap={spacing[2]}>
            <AppText variant="secondary" style={styles.confirmText}>
              Supprimer définitivement cette mesure ?
            </AppText>
            <Button
              title="Supprimer"
              variant="destructive"
              size="lg"
              fullWidth
              loading={deleteMut.isPending}
              onPress={() => deleteMut.mutate()}
            />
            <Button title="Annuler" variant="ghost" fullWidth onPress={() => setConfirmDelete(false)} />
          </Stack>
        ) : (
          <Stack gap={spacing[2]}>
            <Button
              title={isEdit ? 'Enregistrer' : 'Ajouter'}
              size="lg"
              fullWidth
              loading={saveMut.isPending}
              onPress={onSave}
            />
            {isEdit ? (
              <Button
                title="Supprimer la mesure"
                variant="dangerOutline"
                fullWidth
                onPress={() => setConfirmDelete(true)}
              />
            ) : onShowHistory ? (
              <Button
                title="Voir l’historique"
                variant="ghost"
                fullWidth
                disabled={busy}
                onPress={onShowHistory}
              />
            ) : null}
          </Stack>
        )
      }
    >
      <Stack gap={spacing[4]}>
        {showTypeChips ? (
          <FilterOptionChips
            options={CLINICAL_VITAL_UI.map((item) => ({ value: item.type, label: `${item.emoji} ${item.label_fr}` }))}
            value={vitalType}
            onChange={selectType}
          />
        ) : null}

        {config?.has_secondary ? (
          <Stack gap={spacing[2]}>
            <Input
              label={`Systolique (${config.unit})`}
              value={value}
              onChangeText={(v) => {
                setValue(v);
                setErrors((e) => ({ ...e, value: undefined }));
              }}
              keyboardType="decimal-pad"
              placeholder="120"
              error={errors.value}
            />
            <Input
              label={`Diastolique (${config.unit})`}
              value={valueSecondary}
              onChangeText={(v) => {
                setValueSecondary(v);
                setErrors((e) => ({ ...e, valueSecondary: undefined }));
              }}
              keyboardType="decimal-pad"
              placeholder="80"
              error={errors.valueSecondary}
            />
          </Stack>
        ) : (
          <Input
            label={`Valeur (${config?.unit ?? ''})`}
            value={value}
            onChangeText={(v) => {
              setValue(v);
              setErrors((e) => ({ ...e, value: undefined }));
            }}
            keyboardType="decimal-pad"
            placeholder="—"
            error={errors.value}
          />
        )}

        <Stack gap={spacing[2]}>
          <IsoDatePicker
            label="Mesurée le"
            value={recordedDate}
            maximumDate={new Date()}
            onChange={(date) => changeRecordedAt({ date })}
          />
          <PassageTimePicker
            label="À"
            value={recordedTime}
            onChange={(time) => changeRecordedAt({ time })}
          />
          {errors.recordedAt ? (
            <AppText variant="caption" style={styles.error} accessibilityRole="alert">
              {errors.recordedAt}
            </AppText>
          ) : null}
        </Stack>

        <Textarea
          label="Note (optionnelle)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Contexte, position, remarque…"
          numberOfLines={3}
        />

        {saveMut.error || deleteMut.error ? (
          <AppText variant="body" style={styles.error} accessibilityRole="alert">
            {getErrorMessage(saveMut.error ?? deleteMut.error)}
          </AppText>
        ) : null}
      </Stack>
    </SheetModal>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    confirmText: { textAlign: 'center' as const },
    error: { color: c.error },
  };
}
