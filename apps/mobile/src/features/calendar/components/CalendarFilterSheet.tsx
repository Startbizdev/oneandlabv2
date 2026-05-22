import { AppointmentsFilterSheet } from '@/features/appointments/components/AppointmentsFilterSheet';
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
  onApply: () => void;
  onReset: () => void;
}

export function CalendarFilterSheet({
  visible,
  onClose,
  status,
  type,
  onStatusChange,
  onTypeChange,
  onApply,
  onReset,
}: Props) {
  return (
    <AppointmentsFilterSheet
      visible={visible}
      onClose={onClose}
      title="Affiner le calendrier"
      search=""
      onSearchChange={() => {}}
      showSearch={false}
      segments={CALENDAR_STATUS_OPTIONS}
      segment={status}
      onSegmentChange={onStatusChange}
      segmentSectionLabel="Statut"
      secondarySegments={CALENDAR_TYPE_OPTIONS}
      secondarySegment={type}
      onSecondarySegmentChange={(v) => onTypeChange(v as CalendarTypeFilter)}
      secondarySectionLabel="Type de soin"
      onApply={onApply}
      onReset={onReset}
    />
  );
}
