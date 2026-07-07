import { layoutRowBetween } from '@/theme/layout-styles';
import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { History } from 'lucide-react-native';
import { PATIENT_ABSENCE_TYPE_OPTIONS } from '@oneandlab/shared-constants';
import type { PatientAbsence, PatientAbsenceType } from '@oneandlab/shared-types';
import { formatBirthDateFr } from '@oneandlab/shared-utils';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullWidthSegmentBar } from '@/components/ui/FullWidthSegmentBar';
import { Input } from '@/components/ui/Input';
import { SelectField } from '@/components/ui/SelectField';
import { SkeletonList } from '@/components/ui/skeletons';
import { IsoDatePicker } from '@/features/nurse-passage/components/IsoDatePicker';
import {
  createPatientAbsence,
  deletePatientAbsence,
  fetchPatientAbsences,
  updatePatientAbsence,
} from '../api/patient-absence.service';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useToast } from '@/providers/ToastProvider';
import { radius, spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type SheetTab = 'declare' | 'history';

type Props = {
  visible: boolean;
  patientId: string | null;
  patientName?: string;
  defaultStartDate: string;
  existing?: PatientAbsence | null;
  onClose: () => void;
  onSaved: () => void;
};

function isAbsenceActive(absence: PatientAbsence, today = dayjs().format('YYYY-MM-DD')): boolean {
  const start = absence.start_date.slice(0, 10);
  const end = absence.end_date.slice(0, 10);
  return start <= today && end >= today;
}

function formatAbsencePeriod(absence: PatientAbsence): string {
  const start = formatBirthDateFr(absence.start_date.slice(0, 10));
  const end = formatBirthDateFr(absence.end_date.slice(0, 10));
  return `Du ${start} au ${end}`;
}

export function PatientAbsenceSheet({
  visible,
  patientId,
  patientName,
  defaultStartDate,
  existing,
  onClose,
  onSaved,
}: Props) {
  const styles = useThemedStyles(buildStyles);
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<SheetTab>('declare');
  const [editingAbsence, setEditingAbsence] = useState<PatientAbsence | null>(null);
  const [absenceType, setAbsenceType] = useState<PatientAbsenceType>('hospitalization');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultStartDate);
  const [note, setNote] = useState('');

  const historyQ = useQuery({
    queryKey: ['patient-absences', patientId, 'all'],
    queryFn: () => fetchPatientAbsences(patientId!, false),
    enabled: visible && Boolean(patientId),
  });

  const resetFormForNew = useCallback(() => {
    setEditingAbsence(null);
    setAbsenceType('hospitalization');
    setStartDate(defaultStartDate);
    setEndDate(defaultStartDate);
    setNote('');
  }, [defaultStartDate]);

  const applyAbsenceToForm = useCallback((absence: PatientAbsence) => {
    setEditingAbsence(absence);
    setAbsenceType(absence.absence_type);
    setStartDate(absence.start_date.slice(0, 10));
    setEndDate(absence.end_date.slice(0, 10));
    setNote(absence.note ?? '');
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (existing) {
      setTab('declare');
      applyAbsenceToForm(existing);
      return;
    }
    resetFormForNew();
    setTab('history');
  }, [visible, existing, applyAbsenceToForm, resetFormForNew]);

  const invalidateAbsenceQueries = useCallback(async () => {
    if (!patientId) return;
    await qc.invalidateQueries({ queryKey: ['patient-absences', patientId] });
  }, [patientId, qc]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!patientId) throw new Error('Patient requis');
      const payload = {
        absence_type: absenceType,
        start_date: startDate,
        end_date: endDate,
        note: note.trim() || null,
      };
      if (editingAbsence?.id) {
        return updatePatientAbsence(patientId, editingAbsence.id, payload);
      }
      return createPatientAbsence(patientId, payload);
    },
    onSuccess: async () => {
      await invalidateAbsenceQueries();
      onSaved();
      onClose();
    },
    onError: (err) => handleApiError(err, toast, 'patient-absence-save', 'Enregistrement impossible'),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!patientId || !editingAbsence?.id) throw new Error('Absence introuvable');
      await deletePatientAbsence(patientId, editingAbsence.id);
    },
    onSuccess: async () => {
      await invalidateAbsenceQueries();
      onSaved();
      onClose();
    },
    onError: (err) => handleApiError(err, toast, 'patient-absence-delete', 'Suppression impossible'),
  });

  const handleSelectHistoryItem = useCallback(
    (absence: PatientAbsence) => {
      applyAbsenceToForm(absence);
      setTab('declare');
    },
    [applyAbsenceToForm],
  );

  const handleTabChange = useCallback(
    (next: SheetTab) => {
      setTab(next);
      if (next === 'declare' && !editingAbsence) {
        resetFormForNew();
      }
    },
    [editingAbsence, resetFormForNew],
  );

  const segments = useMemo(
    () => [
      { id: 'declare' as const, label: 'Déclarer' },
      {
        id: 'history' as const,
        label: 'Historique',
        badge: historyQ.data?.length,
      },
    ],
    [historyQ.data?.length],
  );

  const isEditing = Boolean(editingAbsence?.id);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Absence patient" snapPoints={['92%']}>
      <View style={styles.body}>
        {patientName ? <AppText style={styles.patientName}>{patientName}</AppText> : null}

        <FullWidthSegmentBar segments={segments} value={tab} onChange={handleTabChange} />

        {tab === 'declare' ? (
          <View style={styles.tabBody}>
            <AppText style={styles.hint}>
              {isEditing
                ? 'Modifiez les informations de cette absence, ou créez-en une nouvelle.'
                : 'Le passage reste visible sur la tournée mais la carte sera grisée avec le motif jusqu\'à la date de fin.'}
            </AppText>

            {isEditing ? (
              <Pressable onPress={resetFormForNew} accessibilityRole="button">
                <AppText style={styles.newAbsenceLink}>Créer une nouvelle absence</AppText>
              </Pressable>
            ) : null}

            <SelectField
              label="Motif"
              value={absenceType}
              options={PATIENT_ABSENCE_TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
              onChange={(v) => setAbsenceType(v as PatientAbsenceType)}
            />

            <IsoDatePicker label="Du" value={startDate} onChange={setStartDate} />
            <IsoDatePicker
              label="Au"
              value={endDate}
              onChange={setEndDate}
              minimumDate={new Date(`${startDate}T12:00:00`)}
            />

            <Input
              label="Précision (optionnel)"
              value={note}
              onChangeText={setNote}
              placeholder="Ex. CHU, chez la famille…"
              multiline
            />

            <Button
              title={
                saveMut.isPending
                  ? 'Enregistrement…'
                  : isEditing
                    ? 'Mettre à jour'
                    : 'Enregistrer l\'absence'
              }
              onPress={() => void saveMut.mutate()}
              loading={saveMut.isPending}
              disabled={deleteMut.isPending}
              fullWidth
            />

            {isEditing ? (
              <Button
                title={deleteMut.isPending ? 'Suppression…' : 'Patient de retour — lever l\'absence'}
                variant="dangerOutline"
                onPress={() => void deleteMut.mutate()}
                loading={deleteMut.isPending}
                disabled={saveMut.isPending}
                fullWidth
              />
            ) : null}
          </View>
        ) : (
          <View style={styles.tabBody}>
            {historyQ.isLoading ? (
              <SkeletonList count={4} />
            ) : historyQ.isError ? (
              <EmptyState
                title="Historique indisponible"
                description="Impossible de charger les absences de ce patient."
                actionLabel="Réessayer"
                onAction={() => void historyQ.refetch()}
              />
            ) : (historyQ.data?.length ?? 0) === 0 ? (
              <EmptyState
                title="Aucune absence enregistrée"
                description="Les absences déclarées pour ce patient apparaîtront ici."
                Icon={History}
                actionLabel="Déclarer une absence"
                onAction={() => {
                  resetFormForNew();
                  setTab('declare');
                }}
              />
            ) : (
              <View style={styles.historyList}>
                {historyQ.data!.map((absence) => {
                  const active = isAbsenceActive(absence);
                  return (
                    <View key={absence.id} style={styles.historyRow}>
                      <View style={styles.historyRowHeader}>
                        <AppText style={styles.historyType} numberOfLines={1}>
                          {absence.type_label_fr}
                        </AppText>
                        {active ? <Badge label="En cours" variant="warning" /> : null}
                      </View>
                      <AppText style={styles.historyDates}>{formatAbsencePeriod(absence)}</AppText>
                      {absence.note?.trim() ? (
                        <AppText style={styles.historyNote} numberOfLines={2}>
                          {absence.note.trim()}
                        </AppText>
                      ) : null}
                      <Pressable
                        onPress={() => handleSelectHistoryItem(absence)}
                        accessibilityRole="button"
                        accessibilityLabel={`Modifier l'absence ${absence.type_label_fr}`}
                      >
                        <AppText style={styles.historyAction}>Modifier</AppText>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

function buildStyles(c: AppColors) {
  return {
    body: { gap: spacing[3], paddingBottom: spacing[4] },
    tabBody: { gap: spacing[3] },
    patientName: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    hint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
    },
    newAbsenceLink: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.primary,
    },
    historyList: { gap: spacing[2] },
    historyRow: {
      gap: spacing[1],
      padding: spacing[3],
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: c.surface,
    },
    historyRowHeader: {
      ...layoutRowBetween(spacing[2]),
    },
    historyType: {
      minWidth: 0,
      flex: 1,
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    historyDates: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    historyNote: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textTertiary,
    },
    historyAction: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.primary,
      marginTop: spacing[0.5],
    },
  };
}
