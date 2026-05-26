import { AppointmentsFilterSheet } from '@/features/appointments/components/AppointmentsFilterSheet';
import {
  NURSE_TAB_OPTIONS,
  type NurseListTab,
} from '@/constants/appointments-list-filters';
import {
  CALENDAR_STATUS_OPTIONS,
  CALENDAR_TYPE_OPTIONS,
  type CalendarStatusFilter,
  type CalendarTypeFilter,
} from '@/constants/calendar-filters';

interface Props {
  visible: boolean;
  onClose: () => void;
  status: CalendarStatusFilter;
  type: CalendarTypeFilter;
  onStatusChange: (v: CalendarStatusFilter) => void;
  onTypeChange: (v: CalendarTypeFilter) => void;
  /** Calendrier infirmier : Mes soins / Bilans dans la modal (comme liste RDV). */
  nurseCalendar?: boolean;
  nurseTab?: NurseListTab;
  onNurseTabChange?: (v: NurseListTab) => void;
}

export function CalendarFilterSheet({
  visible,
  onClose,
  status,
  type,
  onStatusChange,
  onTypeChange,
  nurseCalendar = false,
  nurseTab = 'soins',
  onNurseTabChange,
}: Props) {
  return (
    <AppointmentsFilterSheet
      visible={visible}
      onClose={onClose}
      title="Filtres"
      search=""
      onSearchChange={() => {}}
      showSearch={false}
      closeOnPick={false}
      onReset={() => {
        onStatusChange('');
        onTypeChange('');
        onNurseTabChange?.('soins');
      }}
      tabs={nurseCalendar ? NURSE_TAB_OPTIONS : undefined}
      tab={nurseCalendar ? nurseTab : undefined}
      onTabChange={nurseCalendar ? onNurseTabChange : undefined}
      segments={CALENDAR_STATUS_OPTIONS}
      segment={status}
      onSegmentChange={onStatusChange}
      segmentSectionLabel="Statut"
      secondarySegments={CALENDAR_TYPE_OPTIONS}
      secondarySegment={type}
      onSecondarySegmentChange={(v) => onTypeChange(v as CalendarTypeFilter)}
      secondarySectionLabel="Type de soin"
    />
  );
}
