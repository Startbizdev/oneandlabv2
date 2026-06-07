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
  assigneeCreatorOriginVisible,
  assigneePlatformOriginVisible,
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
import {
  assigneeReviewFromPrefix,
  creatorOriginReviewSummary,
} from '../../utils/assignee-review-display';

type AptExt = Appointment & Record<string, unknown>;

interface Props {
  apt: Appointment;
}

export function PatientAssigneeRows({ apt }: Props) {
  const user = useAuthStore((s) => s.user);
  const ext = apt as AptExt;
  const [sheet, setSheet] = useState<AssigneeProfileSheetState | null>(null);

  const viewerRole = user?.role ?? 'patient';
  if (!hasAssigneeContent(apt, viewerRole)) return null;

  const hideNurse =
    user?.role === 'nurse' && String(ext.assigned_nurse_id ?? '') === String(user.id ?? '');
  const hideLab =
    (user?.role === 'lab' || user?.role === 'subaccount') &&
    String(ext.assigned_lab_id ?? '') === String(user?.id ?? '');
  const hidePreleveur =
    user?.role === 'preleveur' && String(ext.assigned_to ?? '') === String(user?.id ?? '');

  const hideCreatorOrigin = isViewerAppointmentCreator(apt, user?.id);

  const blocks: ReactNode[] = [];
  const openProviderSheet = (
    providerType: 'nurse' | 'lab',
    slug: string,
    title: string,
    phone?: string,
  ) => setSheet({ kind: 'provider', providerType, slug, title, phone: phone || null });

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
        onViewProfile={
          slug
            ? () =>
                openProviderSheet(
                  'nurse',
                  slug,
                  nurseName || 'Infirmier',
                  String(ext.assigned_nurse_phone ?? ''),
                )
            : undefined
        }
        reviewSummary={assigneeReviewFromPrefix(ext, 'assigned_nurse')}
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
        onViewProfile={
          slug
            ? () =>
                openProviderSheet(
                  'lab',
                  slug,
                  labName || 'Laboratoire',
                  String(ext.assigned_lab_phone ?? ''),
                )
            : undefined
        }
        reviewSummary={assigneeReviewFromPrefix(ext, 'assigned_lab')}
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
        reviewSummary={assigneeReviewFromPrefix(ext, 'assigned_to')}
      />,
    );
  }

  const creator = ext.creator_origin as CreatorOrigin | undefined;
  const platformOrigin = String(ext.patient_platform_origin_display ?? '').trim();
  const showCreatorOrigin = assigneeCreatorOriginVisible(creator, viewerRole, hideCreatorOrigin);
  const showPlatform = assigneePlatformOriginVisible(creator, platformOrigin, viewerRole);

  if (showCreatorOrigin && creator) {
    const name = creatorOriginName(creator);
    const title = creatorOriginTitle(creator, viewerRole);
    const platformOriginRow = isPatientPlatformOrigin(creator);
    const profileSheet = resolveCreatorOriginProfileSheet(creator);
    blocks.push(
      <AssigneeProfileRow
        key="creator"
        title={title}
        name={name}
        profileImageUrl={platformOriginRow ? null : creator.profile_image_url}
        brandLogo={platformOriginRow ? 'cary' : undefined}
        phone={creator.phone}
        subtitle={creatorOriginSubtitle(creator, viewerRole)}
        publicSlug={creator.public_slug?.trim() || null}
        onViewProfile={profileSheet ? () => setSheet(profileSheet) : undefined}
        reviewSummary={creatorOriginReviewSummary(creator as Record<string, unknown>)}
      />,
    );
  } else if (showPlatform) {
    blocks.push(
      <AssigneeProfileRow
        key="origin"
        title="Origine"
        name={platformOriginDisplayName(platformOrigin)}
        brandLogo="cary"
        subtitle="Ce rendez-vous a été pris en direct par le patient"
      />,
    );
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
