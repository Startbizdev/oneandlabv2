import type { Appointment } from '@oneandlab/shared-types';
import {
  canCancelAppointment,
  isBloodTestAppointment,
  isNursingAppointment,
  nurseOwnerOnlyActionsVisible,
  staffCanManageOwnPendingBloodTest,
} from '@oneandlab/shared-utils';
import {
  effectiveAppointmentStatus,
  nurseCanRescheduleOrCancel,
} from '@/utils/effective-appointment-status';
import { isAppointmentCanceled } from '@/utils/appointment-detail-display';

export type DetailSidebarActionFlags = {
  reschedule: boolean;
  share: boolean;
  redispatch: boolean;
  cancel: boolean;
};

/** Actions de la fiche RDV ; le confrère d'un binôme n'a pas les actions du titulaire. */
export function detailSidebarActionFlags(
  apt: Appointment,
  viewer: { role: string; viewerId?: string | null },
): DetailSidebarActionFlags {
  const { role, viewerId } = viewer;
  const status = effectiveAppointmentStatus(apt, { role, viewerId });
  const active = ['pending', 'confirmed', 'inProgress', 'in_progress'].includes(status);
  const canceled = isAppointmentCanceled(String(apt.status ?? ''));
  const nursing = isNursingAppointment(apt.type);
  const blood = isBloodTestAppointment(apt.type);
  const ownerActions = nurseOwnerOnlyActionsVisible(apt);
  const nurse = role === 'nurse';
  const otherStaff = role === 'pro' || role === 'preleveur';
  const nurseManage =
    nurseCanRescheduleOrCancel(apt, { role, viewerId })
    || staffCanManageOwnPendingBloodTest(apt, viewerId);
  const canCancel = canCancelAppointment(apt, { role, id: viewerId });

  return {
    reschedule: (nurse && nurseManage) || (otherStaff && active),
    share: nurse && ownerActions && nursing && status !== 'completed' && !canceled,
    redispatch:
      nurse
      && ownerActions
      && status === 'confirmed'
      && ((!nursing && !blood) || (nursing && !canceled)),
    cancel:
      canCancel
      && ((nurse && ownerActions && nurseManage) || (otherStaff && active)),
  };
}
