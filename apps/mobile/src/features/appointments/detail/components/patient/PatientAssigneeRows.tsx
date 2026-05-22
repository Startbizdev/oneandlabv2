import { useState, type ReactNode } from 'react';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { useAuthStore } from '@/store/auth-store';
import { AssigneeProfileRow } from '../AssigneeProfileRow';
import { ProviderPublicProfileSheet } from '../ProviderPublicProfileSheet';
import { hasAssigneeContent } from '../RdvAssigneeSection';
import { DetailSection } from '../layout/DetailSection';
import { appointmentAssigneeGender } from '../../utils/patient-appointment-display';
import {
  creatorOriginName,
  creatorOriginTitle,
  type CreatorOrigin,
} from '../../utils/provider-public-profile';

type AptExt = Appointment & Record<string, unknown>;

type SheetTarget = { type: 'nurse' | 'lab'; slug: string; title: string } | null;

interface Props {
  apt: Appointment;
}

export function PatientAssigneeRows({ apt }: Props) {
  const user = useAuthStore((s) => s.user);
  const ext = apt as AptExt;
  const [sheet, setSheet] = useState<SheetTarget>(null);

  if (!hasAssigneeContent(apt, 'patient')) return null;

  const hideNurse =
    user?.role === 'nurse' && String(ext.assigned_nurse_id ?? '') === String(user.id ?? '');
  const hideLab =
    (user?.role === 'lab' || user?.role === 'subaccount') &&
    String(ext.assigned_lab_id ?? '') === String(user?.id ?? '');
  const hidePreleveur =
    user?.role === 'preleveur' && String(ext.assigned_to ?? '') === String(user?.id ?? '');

  const blocks: ReactNode[] = [];
  const openSheet = (type: 'nurse' | 'lab', slug: string, title: string) =>
    setSheet({ type, slug, title });

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
        onViewProfile={slug ? () => openSheet('nurse', slug, nurseName || 'Infirmier') : undefined}
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
        onViewProfile={slug ? () => openSheet('lab', slug, labName || 'Laboratoire') : undefined}
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
  if (creator?.kind) {
    const name = creatorOriginName(creator);
    const title = creatorOriginTitle(creator);
    const slug = creator.public_slug?.trim();
    const providerType = creator.kind === 'lab_team' ? 'lab' : creator.kind === 'nurse' ? 'nurse' : null;
    blocks.push(
      <AssigneeProfileRow
        key="creator"
        title={title}
        name={name}
        profileImageUrl={creator.profile_image_url}
        phone={creator.phone}
        subtitle={
          creator.kind === 'nurse'
            ? 'Saisie par un infirmier'
            : creator.kind === 'pro'
              ? creator.emploi?.trim() || undefined
              : undefined
        }
        publicSlug={slug || null}
        onViewProfile={
          slug && providerType
            ? () => openSheet(providerType, slug, name)
            : undefined
        }
      />,
    );
  } else {
    const platformOrigin = String(ext.patient_platform_origin_display ?? '').trim();
    if (platformOrigin) {
      blocks.push(
        <AssigneeProfileRow key="origin" title="Origine" name={platformOrigin} />,
      );
    }
  }

  if (!blocks.length) return null;

  return (
    <>
      <DetailSection>{blocks}</DetailSection>
      {sheet ? (
        <ProviderPublicProfileSheet
          visible
          onClose={() => setSheet(null)}
          providerType={sheet.type}
          slug={sheet.slug}
          title={sheet.title}
        />
      ) : null}
    </>
  );
}
