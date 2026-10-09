import dayjs from 'dayjs';
import { CalendarOff, History } from 'lucide-react-native';
import type { UseQueryResult } from '@tanstack/react-query';
import type { PatientAbsence } from '@oneandlab/shared-types';
import {
  PATIENT_ABSENCE_OPEN_END_LABEL,
  formatBirthDateFr,
  isPatientAbsenceActiveOn,
} from '@oneandlab/shared-utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { SkeletonList } from '@/components/ui/skeletons';

type Props = {
  historyQ: UseQueryResult<PatientAbsence[]>;
  onSelect: (absence: PatientAbsence) => void;
  onDeclare: () => void;
};

function formatAbsencePeriod(absence: PatientAbsence): string {
  const start = formatBirthDateFr(absence.start_date.slice(0, 10));
  if (absence.end_date === null) return `Depuis le ${start}, ${PATIENT_ABSENCE_OPEN_END_LABEL}`;
  return `Du ${start} au ${formatBirthDateFr(absence.end_date.slice(0, 10))}`;
}

function absenceDescription(absence: PatientAbsence): string {
  const parts = [formatAbsencePeriod(absence)];
  if (isPatientAbsenceActiveOn(absence, dayjs().format('YYYY-MM-DD'))) parts.push('En cours');
  const note = absence.note?.trim();
  if (note) parts.push(note);
  return parts.join(' · ');
}

/** Onglet « Historique » de la sheet d'absence : toucher une absence l'ouvre en modification. */
export function PatientAbsenceHistoryList({ historyQ, onSelect, onDeclare }: Props) {
  const history = historyQ.data ?? [];

  if (historyQ.isLoading) return <SkeletonList count={4} />;
  if (historyQ.isError) {
    return (
      <ErrorState title="Historique indisponible" error={historyQ.error} onRetry={() => void historyQ.refetch()} />
    );
  }
  if (history.length === 0) {
    return <EmptyState title="Aucune absence" Icon={History} actionLabel="Déclarer une absence" onAction={onDeclare} />;
  }

  return (
    <SettingsSection
      items={history.map((absence) => ({
        icon: CalendarOff,
        label: absence.type_label_fr,
        description: absenceDescription(absence),
        onPress: () => onSelect(absence),
      }))}
    />
  );
}
