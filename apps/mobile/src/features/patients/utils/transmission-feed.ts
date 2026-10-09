import type { PatientTransmission } from '@oneandlab/shared-types';
import { groupTransmissionsByDay } from '@oneandlab/shared-utils';
import { appointmentDaySectionLabel } from '@/utils/appointment-list-sections';

export interface TransmissionDaySection {
  key: string;
  title: string;
  data: PatientTransmission[];
}

/** Sections du fil : « Aujourd'hui », « Hier », sinon « Lundi 5 octobre ». */
export function transmissionDaySections(items: PatientTransmission[], now: Date = new Date()): TransmissionDaySection[] {
  return groupTransmissionsByDay(items).map(({ day, items: data }) => ({
    key: day,
    title: appointmentDaySectionLabel(`${day} 12:00:00`, now),
    data,
  }));
}
