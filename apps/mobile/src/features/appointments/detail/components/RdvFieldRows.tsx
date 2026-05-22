import type { Appointment } from '@oneandlab/shared-types';
import { buildAppointmentDetailKvRows } from '@/utils/appointment-detail-display';
import { useAppointmentCareCategories } from '@/features/appointments/detail/hooks/use-appointment-care-categories';
import { RdvKvCard } from './RdvKvCard';

interface Props {
  apt: Appointment;
  role: string;
  hideAddress?: boolean;
  /** Masquer date/heure (déjà dans le hero). */
  hideScheduledDate?: boolean;
}

export function RdvFieldRows({
  apt,
  role,
  hideAddress: hideAddressProp,
  hideScheduledDate,
}: Props) {
  const hideAddress = hideAddressProp ?? role !== 'patient';
  const categoriesQ = useAppointmentCareCategories();
  const rows = buildAppointmentDetailKvRows(apt, {
    hideAddress,
    hideScheduledDate,
    categories: categoriesQ.data,
  });
  return <RdvKvCard rows={rows} />;
}
