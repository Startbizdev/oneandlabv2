import { Linking } from 'react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { useAuthStore } from '@/store/auth-store';
import { UserCircle } from 'lucide-react-native';
import { hasAssigneeContent } from '../RdvAssigneeSection';
import { DetailPersonBlock } from '../layout/DetailPersonBlock';
import { DetailSection } from '../layout/DetailSection';

type AptExt = Appointment & Record<string, unknown>;

function phoneActions(phone?: string) {
  const tel = String(phone ?? '').trim().replace(/\s/g, '');
  if (!tel) return [];
  return [
    {
      key: 'phone',
      label: 'Appeler',
      icon: 'phone' as const,
      onPress: () => void Linking.openURL(`tel:${tel}`),
    },
    {
      key: 'sms',
      label: 'Message',
      icon: 'message' as const,
      onPress: () => void Linking.openURL(`sms:${tel}`),
    },
  ];
}

interface Props {
  apt: Appointment;
}

export function PatientAssigneeRows({ apt }: Props) {
  const user = useAuthStore((s) => s.user);
  const ext = apt as AptExt;

  if (!hasAssigneeContent(apt, 'patient')) return null;

  const hideNurse =
    user?.role === 'nurse' && String(ext.assigned_nurse_id ?? '') === String(user.id ?? '');
  const hideLab =
    (user?.role === 'lab' || user?.role === 'subaccount') &&
    String(ext.assigned_lab_id ?? '') === String(user?.id ?? '');
  const hidePreleveur =
    user?.role === 'preleveur' && String(ext.assigned_to ?? '') === String(user?.id ?? '');

  const blocks: React.ReactNode[] = [];

  const nurseName = String(ext.assigned_nurse_display_name ?? '').trim();
  if (isNursingAppointment(apt.type) && !hideNurse && (nurseName || ext.assigned_nurse_id)) {
    blocks.push(
      <DetailPersonBlock
        key="nurse"
        title="Infirmier(e)"
        name={nurseName || 'Assigné'}
        actions={phoneActions(String(ext.assigned_nurse_phone ?? ''))}
      />,
    );
  }

  const labName = String(ext.assigned_lab_display_name ?? '').trim();
  if (isBloodTestAppointment(apt.type) && !hideLab && (labName || ext.assigned_lab_id)) {
    blocks.push(
      <DetailPersonBlock
        key="lab"
        title="Laboratoire"
        name={labName || 'Assigné'}
        actions={phoneActions(String(ext.assigned_lab_phone ?? ''))}
      />,
    );
  }

  const preleveurName = String(ext.assigned_to_display_name ?? '').trim();
  if (
    isBloodTestAppointment(apt.type) &&
    !hidePreleveur &&
    (preleveurName || ext.assigned_to)
  ) {
    blocks.push(
      <DetailPersonBlock
        key="prel"
        title="Préleveur"
        name={preleveurName || 'Assigné'}
        actions={phoneActions(
          String(ext.assigned_preleveur_phone ?? ext.assigned_to_phone ?? ''),
        )}
      />,
    );
  }

  const platformOrigin = String(ext.patient_platform_origin_display ?? '').trim();
  if (platformOrigin) {
    blocks.push(
      <DetailPersonBlock key="origin" title="Origine" name={platformOrigin} />,
    );
  }

  if (!blocks.length) return null;

  return (
    <DetailSection title="Intervenants" Icon={UserCircle}>
      {blocks}
    </DetailSection>
  );
}
