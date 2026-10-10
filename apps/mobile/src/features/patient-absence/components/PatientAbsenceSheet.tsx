import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { PATIENT_ABSENCE_TYPE_OPTIONS } from '@oneandlab/shared-constants';
import type { PatientAbsence, PatientAbsenceType } from '@oneandlab/shared-types';
import { Row } from '@/components/layout/primitives';
import { SheetModal } from '@/components/ui/SheetModal';
import { Button } from '@/components/ui/Button';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';
import { FullWidthSegmentBar } from '@/components/ui/FullWidthSegmentBar';
import { Input } from '@/components/ui/Input';
import { SelectField } from '@/components/ui/SelectField';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { IsoDatePicker } from '@/features/nurse-passage/components/IsoDatePicker';
import { PatientAbsenceHistoryList } from './PatientAbsenceHistoryList';
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

function todayIso(): string {
  return dayjs().format('YYYY-MM-DD');
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
  const [openEnded, setOpenEnded] = useState(false);
  const [note, setNote] = useState('');
  const [confirmLiftOpen, setConfirmLiftOpen] = useState(false);

  const historyQ = useQuery({
    queryKey: ['patient-absences', patientId, 'all'],
    queryFn: () => (patientId ? fetchPatientAbsences(patientId, false) : Promise.resolve([])),
    enabled: visible && Boolean(patientId),
  });

  const resetFormForNew = useCallback(() => {
    setEditingAbsence(null);
    setAbsenceType('hospitalization');
    setStartDate(defaultStartDate);
    setEndDate(defaultStartDate);
    setOpenEnded(false);
    setNote('');
  }, [defaultStartDate]);

  const applyAbsenceToForm = useCallback((absence: PatientAbsence) => {
    const start = absence.start_date.slice(0, 10);
    setEditingAbsence(absence);
    setAbsenceType(absence.absence_type);
    setStartDate(start);
    setEndDate(absence.end_date?.slice(0, 10) ?? start);
    setOpenEnded(absence.end_date === null);
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

  const afterChange = useCallback(async () => {
    await invalidateAbsenceQueries();
    onSaved();
    onClose();
  }, [invalidateAbsenceQueries, onClose, onSaved]);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!patientId) throw new Error('Patient requis');
      const payload = {
        absence_type: absenceType,
        start_date: startDate,
        end_date: openEnded ? null : endDate,
        note: note.trim() || null,
      };
      if (editingAbsence?.id) {
        return updatePatientAbsence(patientId, editingAbsence.id, payload);
      }
      return createPatientAbsence(patientId, payload);
    },
    onSuccess: afterChange,
    onError: (err) => handleApiError(err, toast, 'patient-absence-save', 'Enregistrement impossible'),
  });

  const endTodayMut = useMutation({
    mutationFn: async () => {
      if (!patientId || !editingAbsence?.id) throw new Error('Absence introuvable');
      return updatePatientAbsence(patientId, editingAbsence.id, { end_date: todayIso() });
    },
    onSuccess: afterChange,
    onError: (err) => handleApiError(err, toast, 'patient-absence-end', 'Mise à jour impossible'),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!patientId || !editingAbsence?.id) throw new Error('Absence introuvable');
      await deletePatientAbsence(patientId, editingAbsence.id);
    },
    onSuccess: async () => {
      setConfirmLiftOpen(false);
      await afterChange();
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

  const handleStartDateChange = useCallback((iso: string) => {
    setStartDate(iso);
    setEndDate((end) => (end < iso ? iso : end));
  }, []);

  const segments = useMemo(
    () => [
      { id: 'declare' as const, label: editingAbsence ? 'Modifier' : 'Déclarer' },
      { id: 'history' as const, label: 'Historique', badge: historyQ.data?.length },
    ],
    [editingAbsence, historyQ.data?.length],
  );

  const isEditing = Boolean(editingAbsence?.id);
  const busy = saveMut.isPending || endTodayMut.isPending || deleteMut.isPending;
  /** Une absence sans fin déjà commencée se clôt aujourd'hui (le patient rentre). */
  const canEndToday =
    editingAbsence !== null &&
    editingAbsence.end_date === null &&
    editingAbsence.start_date.slice(0, 10) <= todayIso();
  const endTodayLabel =
    editingAbsence?.absence_type === 'hospitalization' ? 'Fin de l’hospitalisation' : 'Fin de l’absence';

  return (
    <>
      <SheetModal
        visible={visible}
        onClose={onClose}
        title={patientName ? `Absence de ${patientName}` : 'Absence du patient'}
        snapPoints={['92%']}
        dismissible={!busy}
        footer={
          tab === 'declare' ? (
            <Button
              title={isEditing ? 'Mettre à jour' : 'Enregistrer l’absence'}
              onPress={() => saveMut.mutate()}
              loading={saveMut.isPending}
              disabled={busy && !saveMut.isPending}
              fullWidth
            />
          ) : undefined
        }
      >
        <View style={styles.body}>
          <FullWidthSegmentBar segments={segments} value={tab} onChange={handleTabChange} />

          {tab === 'declare' ? (
            <View style={styles.tabBody}>
              <AppText variant="secondary">Le passage reste sur la tournée, grisé jusqu’à la date de retour. Ce jour-là, le soin reprend.</AppText>

              <SelectField
                label="Motif"
                value={absenceType}
                options={ABSENCE_TYPE_OPTIONS}
                onChange={(v) => setAbsenceType(v as PatientAbsenceType)}
              />

              <IsoDatePicker label="Du" value={startDate} onChange={handleStartDateChange} />

              <Row gap={spacing[3]} style={styles.toggleRow}>
                <AppText variant="body" style={styles.toggleLabel}>
                  Jusqu’à nouvel ordre
                </AppText>
                <ToggleSwitch
                  value={openEnded}
                  onValueChange={setOpenEnded}
                  accessibilityLabel="Absence jusqu’à nouvel ordre, sans date de fin"
                />
              </Row>

              {openEnded ? null : (
                <IsoDatePicker
                  label="Date de retour (facultatif)"
                  value={endDate}
                  onChange={setEndDate}
                  minimumDate={new Date(`${startDate}T12:00:00`)}
                />
              )}

              <Input
                label="Précision (optionnel)"
                value={note}
                onChangeText={setNote}
                placeholder="Ex. CHU, chez la famille…"
                multiline
              />

              {isEditing ? (
                <>
                  {canEndToday ? (
                    <Button
                      title={endTodayLabel}
                      variant="outline"
                      onPress={() => endTodayMut.mutate()}
                      loading={endTodayMut.isPending}
                      disabled={busy && !endTodayMut.isPending}
                      fullWidth
                    />
                  ) : null}
                  <Button
                    title="Patient de retour"
                    variant="dangerOutline"
                    onPress={() => setConfirmLiftOpen(true)}
                    disabled={busy}
                    fullWidth
                  />
                  <Button title="Nouvelle absence" variant="ghost" onPress={resetFormForNew} fullWidth />
                </>
              ) : null}
            </View>
          ) : (
            <View style={styles.tabBody}>
              <PatientAbsenceHistoryList
                historyQ={historyQ}
                onSelect={handleSelectHistoryItem}
                onDeclare={() => {
                  resetFormForNew();
                  setTab('declare');
                }}
              />
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
    toggleRow: { alignItems: 'center' as const, minWidth: 0 },
    toggleLabel: { flex: 1, minWidth: 0 },
  };
}
