import { cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from 'react';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { useAuthStore } from '@/store/auth-store';
import { AssigneeProfileRow } from '../AssigneeProfileRow';
import { AssigneeProfileSheets } from '../AssigneeProfileSheets';
import { hasAssigneeContent } from '../RdvAssigneeSection';
import { DetailSection } from '../layout/DetailSection';
import { appointmentAssigneeGender } from '../../utils/patient-appointment-display';
import {
  creatorOriginName,
  creatorOriginSubtitle,
  creatorOriginTitle,
  isPatientPlatformOrigin,
  isViewerAppointmentCreator,
  platformOriginDisplayName,
  resolveCreatorOriginProfileSheet,
  type AssigneeProfileSheetState,
  type CreatorOrigin,
} from '../../utils/provider-public-profile';

type AptExt = Appointment & Record<string, unknown>;

interface Props {
  apt: Appointment;
}

export function PatientAssigneeRows({ apt }: Props) {
  const user = useAuthStore((s) => s.user);
  const ext = apt as AptExt;
  const [sheet, setSheet] = useState<AssigneeProfileSheetState | null>(null);

  if (!hasAssigneeContent(apt, 'patient')) return null;

  const hideNurse =
    user?.role === 'nurse' && String(ext.assigned_nurse_id ?? '') === String(user.id ?? '');
  const hideLab =
    (user?.role === 'lab' || user?.role === 'subaccount') &&
    String(ext.assigned_lab_id ?? '') === String(user?.id ?? '');
  const hidePreleveur =
    user?.role === 'preleveur' && String(ext.assigned_to ?? '') === String(user?.id ?? '');

  const hideCreatorOrigin = isViewerAppointmentCreator(apt, user?.id);

  const blocks: ReactNode[] = [];
  const openWebSheet = (providerType: 'nurse' | 'lab', slug: string, title: string) =>
    setSheet({ kind: 'web', providerType, slug, title });

  const nurseName = String(ext.assigned_nurse_display_name ?? '').trim();
  if (isNursingAppointment(apt.type) && !hideNurse && (nurseName || ext.assigned_nurse_id)) {
    const slug = String(ext.assigned_nurse_public_slug ?? '').trim();
    blocks.push(
      <AssigneeProfileRow
        key="nurse"
        title="Infirmier(e)"
        name={nurseName || 'Assigné'}
        profileImageUrl={String(ext.assigned_nurse_profile_image_url ?? '') || null}
        gender={appointmentAssigneeGender(apt, 'nurse')}
        phone={String(ext.assigned_nurse_phone ?? '')}
        publicSlug={slug || null}
        onViewProfile={slug ? () => openWebSheet('nurse', slug, nurseName || 'Infirmier') : undefined}
      />,
    );
  }

  const labName = String(ext.assigned_lab_display_name ?? '').trim();
  if (isBloodTestAppointment(apt.type) && !hideLab && (labName || ext.assigned_lab_id)) {
    const slug = String(ext.assigned_lab_public_slug ?? '').trim();
    blocks.push(
      <AssigneeProfileRow
        key="lab"
        title="Laboratoire"
        name={labName || 'Assigné'}
        profileImageUrl={String(ext.assigned_lab_profile_image_url ?? '') || null}
        gender={appointmentAssigneeGender(apt, 'lab')}
        phone={String(ext.assigned_lab_phone ?? '')}
        publicSlug={slug || null}
        onViewProfile={slug ? () => openWebSheet('lab', slug, labName || 'Laboratoire') : undefined}
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
      <AssigneeProfileRow
        key="prel"
        title="Préleveur"
        name={preleveurName || 'Assigné'}
        profileImageUrl={String(ext.assigned_to_profile_image_url ?? '') || null}
        gender={appointmentAssigneeGender(apt, 'preleveur')}
        phone={String(ext.assigned_preleveur_phone ?? ext.assigned_to_phone ?? '')}
      />,
    );
  }

  const creator = ext.creator_origin as CreatorOrigin | undefined;
  const hideOriginForPatient = user?.role === 'patient';
  if (!hideOriginForPatient && creator?.kind && !hideCreatorOrigin) {
    const name = creatorOriginName(creator);
    const title = creatorOriginTitle(creator);
    const platformOrigin = isPatientPlatformOrigin(creator);
    const profileSheet = resolveCreatorOriginProfileSheet(creator);
    blocks.push(
      <AssigneeProfileRow
        key="creator"
        title={title}
        name={name}
        profileImageUrl={platformOrigin ? null : creator.profile_image_url}
        brandLogo={platformOrigin ? 'cary' : undefined}
        phone={creator.phone}
        subtitle={creatorOriginSubtitle(creator)}
        publicSlug={creator.public_slug?.trim() || null}
        onViewProfile={profileSheet ? () => setSheet(profileSheet) : undefined}
      />,
    );
  } else if (!hideOriginForPatient) {
    const rawPlatform = String(ext.patient_platform_origin_display ?? '').trim();
    if (rawPlatform) {
      blocks.push(
        <AssigneeProfileRow
          key="origin"
          title="Origine"
          name={platformOriginDisplayName(rawPlatform)}
          brandLogo="cary"
          subtitle="Ce rendez-vous a été pris en direct par le patient"
        />,
      );
    }
  }

  if (!blocks.length) return null;

  return (
    <>
      <DetailSection>
        {blocks.map((block, index) =>
          isValidElement(block)
            ? cloneElement(block as ReactElement<{ showDivider?: boolean }>, {
                showDivider: index < blocks.length - 1,
              })
            : block,
        )}
      </DetailSection>
      <AssigneeProfileSheets sheet={sheet} onClose={() => setSheet(null)} />
    </>
  );
}
