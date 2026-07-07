import { layoutRowWrap } from '@/theme/layout-styles';
import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
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
import { spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

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
  const styles = useThemedStyles(buildStyles);
  const qc = useQueryClient();

  const isEdit = Boolean(reading?.id);
  const [vitalType, setVitalType] = useState<ClinicalVitalType>('heart_rate');
  const [value, setValue] = useState('');
  const [valueSecondary, setValueSecondary] = useState('');
  const [notes, setNotes] = useState('');

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
  }, [visible, reading, initialType]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const num = parseFloat(value.replace(',', '.'));
      if (!Number.isFinite(num)) throw new Error('Valeur invalide');
      const payload = {
        vital_type: vitalType,
        value: num,
        notes: notes.trim() || null,
        ...(config?.has_secondary
          ? {
              value_secondary: parseFloat(valueSecondary.replace(',', '.')),
            }
          : {}),
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
            onPress={() => saveMut.mutate()}
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
                  onPress={() => setVitalType(item.type)}
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
              onChangeText={setValue}
              keyboardType="decimal-pad"
              placeholder="120"
            />
            <Input
              label={`Diastolique (${config.unit})`}
              value={valueSecondary}
              onChangeText={setValueSecondary}
              keyboardType="decimal-pad"
              placeholder="80"
            />
          </Stack>
        ) : (
          <Input
            label={`Valeur (${config?.unit ?? ''})`}
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            placeholder="—"
          />
        )}

        <Textarea
          label="Note (optionnelle)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Contexte, position, remarque…"
          numberOfLines={3}
        />

        {saveMut.isError ? (
          <AppText style={styles.error}>
            {saveMut.error instanceof Error ? saveMut.error.message : 'Erreur'}
          </AppText>
        ) : null}
      </Stack>
    </BottomSheet>
  );
}

function buildStyles(c: AppColors) {
  return {
    typeGrid: {
      ...layoutRowWrap(spacing[2]),
    },
    error: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.error,
    },
  };
}
