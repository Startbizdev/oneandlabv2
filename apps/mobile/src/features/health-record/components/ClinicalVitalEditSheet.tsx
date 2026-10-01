import { layoutRowWrap } from '@/theme/layout-styles';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ClinicalVitalContext,
  ClinicalVitalReading,
  ClinicalVitalType,
} from '@oneandlab/shared-types';
import { CLINICAL_VITAL_UI } from '@oneandlab/shared-types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Stack } from '@/components/layout/primitives';
import {
  clinicalVitalsQueryKey,
  createClinicalVital,
  deleteClinicalVital,
  updateClinicalVital,
} from '../api/clinical-vitals.service';
import { validateClinicalVital, type ClinicalVitalFieldErrors } from '../utils/clinical-vital-bounds';
import { getErrorMessage } from '@/lib/errors/handle-api-error';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';

type Props = {
  visible: boolean;
  patientId: string;
  reading?: ClinicalVitalReading | null;
  initialType?: ClinicalVitalType | null;
  context?: ClinicalVitalContext;
  stackBehavior?: 'push' | 'switch' | 'replace';
  onClose: () => void;
};

export function ClinicalVitalEditSheet({
  visible,
  patientId,
  reading,
  initialType,
  context,
  stackBehavior = 'switch',
  onClose,
}: Props) {
  const styles = useStyles(buildStyles);
  const qc = useQueryClient();

  const isEdit = Boolean(reading?.id);
  const [vitalType, setVitalType] = useState<ClinicalVitalType>('heart_rate');
  const [value, setValue] = useState('');
  const [valueSecondary, setValueSecondary] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<ClinicalVitalFieldErrors>({});

  const config = useMemo(() => CLINICAL_VITAL_UI.find((x) => x.type === vitalType), [vitalType]);

  useEffect(() => {
    if (!visible) return;
    const type = reading?.vital_type ?? initialType ?? 'heart_rate';
    setVitalType(type);
    setValue(reading ? String(reading.value) : '');
    setValueSecondary(
      reading?.value_secondary != null ? String(reading.value_secondary) : '',
    );
    setNotes(reading?.notes ?? '');
    setErrors({});
  }, [visible, reading, initialType]);

  const saveMut = useMutation({
    mutationFn: async (parsed: { value: number; valueSecondary: number | null }) => {
      const payload = {
        vital_type: vitalType,
        value: parsed.value,
        notes: notes.trim() || null,
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
      void qc.invalidateQueries({ queryKey: clinicalVitalsQueryKey(patientId) });
      void qc.invalidateQueries({ queryKey: ['clinical-vitals-history', patientId] });
      onClose();
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => {
      if (!reading?.id) throw new Error('Constante introuvable');
      return deleteClinicalVital(patientId, reading.id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: clinicalVitalsQueryKey(patientId) });
      void qc.invalidateQueries({ queryKey: ['clinical-vitals-history', patientId] });
      onClose();
    },
  });

  const onSave = () => {
    const unit = config?.unit ?? '';
    const result = validateClinicalVital(vitalType, unit, value, valueSecondary, Boolean(config?.has_secondary));
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    saveMut.mutate({ value: result.value, valueSecondary: result.valueSecondary });
  };

  const selectType = (type: ClinicalVitalType) => {
    setVitalType(type);
    setErrors({});
  };

  const title = isEdit
    ? `Modifier — ${config?.label_fr ?? 'Constante'}`
    : config?.label_fr ?? 'Nouvelle constante';

  const snapPoints = useMemo(() => {
    if (config?.has_secondary) return ['90%'];
    if (!isEdit) return ['80%'];
    return ['72%'];
  }, [config?.has_secondary, isEdit]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      snapPoints={snapPoints}
      stackBehavior={stackBehavior}
      footer={
        <Stack gap={spacing[2]}>
          <Button
            title={isEdit ? 'Enregistrer' : 'Ajouter'}
            loading={saveMut.isPending}
            onPress={onSave}
          />
          {isEdit ? (
            <Button
              title="Supprimer"
              variant="destructive"
              loading={deleteMut.isPending}
              onPress={() => deleteMut.mutate()}
            />
          ) : null}
        </Stack>
      }
    >
      <Stack gap={spacing[4]}>
        {!isEdit ? (
          <View style={styles.typeGrid}>
            {CLINICAL_VITAL_UI.map((item) => {
              const active = item.type === vitalType;
              return (
                <Button
                  key={item.type}
                  title={`${item.emoji} ${item.label_fr}`}
                  variant={active ? 'primary' : 'secondary'}
                  size="sm"
                  onPress={() => selectType(item.type)}
                  accessibilityState={{ selected: active }}
                />
              );
            })}
          </View>
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

        <Textarea
          label="Note (optionnelle)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Contexte, position, remarque…"
          numberOfLines={3}
        />

        {saveMut.error || deleteMut.error ? (
          <AppText style={styles.error} accessibilityRole="alert">
            {getErrorMessage(saveMut.error ?? deleteMut.error)}
          </AppText>
        ) : null}
      </Stack>
    </BottomSheet>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    typeGrid: {
      ...layoutRowWrap(spacing[2]),
    },
    error: {
      ...font.medium,
      fontSize: fontSize.sm,
      color: c.error,
    },
  };
}
