import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { CalendarOff, History } from 'lucide-react-native';
import { PATIENT_ABSENCE_TYPE_OPTIONS } from '@oneandlab/shared-constants';
import type { PatientAbsence, PatientAbsenceType } from '@oneandlab/shared-types';
import { formatBirthDateFr } from '@oneandlab/shared-utils';
import { SheetModal } from '@/components/ui/SheetModal';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FullWidthSegmentBar } from '@/components/ui/FullWidthSegmentBar';
import { Input } from '@/components/ui/Input';
import { SelectField } from '@/components/ui/SelectField';
import { SettingsSection } from '@/components/ui/SettingsSection';
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
import { spacing, AppText, useStyles } from '@/theme';

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

const ABSENCE_TYPE_OPTIONS = PATIENT_ABSENCE_TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.value }));

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

function absenceDescription(absence: PatientAbsence): string {
  const parts = [formatAbsencePeriod(absence)];
  if (isAbsenceActive(absence)) parts.push('En cours');
  const note = absence.note?.trim();
  if (note) parts.push(note);
  return parts.join(' · ');
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
  const styles = useStyles(buildStyles);
  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<SheetTab>('declare');
  const [editingAbsence, setEditingAbsence] = useState<PatientAbsence | null>(null);
  const [absenceType, setAbsenceType] = useState<PatientAbsenceType>('hospitalization');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultStartDate);
  const [note, setNote] = useState('');
  const [confirmLiftOpen, setConfirmLiftOpen] = useState(false);

  const historyQ = useQuery({
    queryKey: ['patient-absences', patientId, 'all'],
    queryFn: () => (patientId ? fetchPatientAbsences(patientId, false) : Promise.resolve([])),
    enabled: visible && Boolean(patientId),
  });
  const history = historyQ.data ?? [];

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
      setConfirmLiftOpen(false);
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
      { id: 'declare' as const, label: editingAbsence ? 'Modifier' : 'Déclarer' },
      { id: 'history' as const, label: 'Historique', badge: historyQ.data?.length },
    ],
    [editingAbsence, historyQ.data?.length],
  );

  const isEditing = Boolean(editingAbsence?.id);

  const historyRows = history.map((absence) => ({
    icon: CalendarOff,
    label: absence.type_label_fr,
    description: absenceDescription(absence),
    onPress: () => handleSelectHistoryItem(absence),
  }));

  return (
    <>
      <SheetModal
        visible={visible}
        onClose={onClose}
        title={patientName ? `Absence de ${patientName}` : 'Absence du patient'}
        snapPoints={['92%']}
      >
        <View style={styles.body}>
          <FullWidthSegmentBar segments={segments} value={tab} onChange={handleTabChange} />

          {tab === 'declare' ? (
            <View style={styles.tabBody}>
              <AppText variant="secondary">
                Le passage reste sur la tournée, grisé jusqu’à la date de fin.
              </AppText>

              <SelectField
                label="Motif"
                value={absenceType}
                options={ABSENCE_TYPE_OPTIONS}
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
                title={isEditing ? 'Mettre à jour' : 'Enregistrer l’absence'}
                onPress={() => saveMut.mutate()}
                loading={saveMut.isPending}
                disabled={deleteMut.isPending}
                fullWidth
              />

              {isEditing ? (
                <>
                  <Button
                    title="Patient de retour"
                    variant="dangerOutline"
                    onPress={() => setConfirmLiftOpen(true)}
                    disabled={saveMut.isPending}
                    fullWidth
                  />
                  <Button title="Nouvelle absence" variant="ghost" onPress={resetFormForNew} fullWidth />
                </>
              ) : null}
            </View>
          ) : (
            <View style={styles.tabBody}>
              {historyQ.isLoading ? (
                <SkeletonList count={4} />
              ) : historyQ.isError ? (
                <ErrorState
                  title="Historique indisponible"
                  error={historyQ.error}
                  onRetry={() => void historyQ.refetch()}
                />
              ) : history.length === 0 ? (
                <EmptyState
                  title="Aucune absence"
                  Icon={History}
                  actionLabel="Déclarer une absence"
                  onAction={() => {
                    resetFormForNew();
                    setTab('declare');
                  }}
                />
              ) : (
                <SettingsSection items={historyRows} />
              )}
            </View>
          )}
        </View>
      </SheetModal>

      <ConfirmSheet
        visible={confirmLiftOpen}
        title="Lever l’absence ?"
        message="L’absence est supprimée et les passages redeviennent actifs."
        confirmLabel="Lever l’absence"
        tone="destructive"
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
        onClose={() => setConfirmLiftOpen(false)}
      />
    </>
  );
}

function buildStyles() {
  return {
    body: { gap: spacing[3], paddingBottom: spacing[4] },
    tabBody: { gap: spacing[3] },
  };
}
