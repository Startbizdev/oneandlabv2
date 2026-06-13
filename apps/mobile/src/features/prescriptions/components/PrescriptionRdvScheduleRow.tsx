import type { ReactNode } from 'react';
import type { Appointment } from '@oneandlab/shared-types';
import {
  RdvScheduleCompactRow,
  rdvScheduleCalendarPx,
} from '@/features/appointments/components/RdvScheduleCompactRow';

interface Props {
  apt: Appointment;
  /** Surcharge le libellé créneau (ex. historique ordonnance). */
  creneauLabel?: string;
  careLabel?: string;
  trailing?: ReactNode;
  /** Espacement plus généreux (liste sélecteur RDV). */
  relaxed?: boolean;
}

/** Ligne RDV — wrapper autour de `RdvScheduleCompactRow`. */
export function PrescriptionRdvScheduleRow({
  apt,
  creneauLabel,
  careLabel,
  trailing,
  relaxed = false,
}: Props) {
  return (
    <RdvScheduleCompactRow
      apt={apt}
      creneauLabel={creneauLabel}
      careLabel={careLabel}
      trailing={trailing}
      density={relaxed ? 'relaxed' : 'compact'}
    />
  );
}

export { rdvScheduleCalendarPx as prescriptionRdvCalendarPx };
