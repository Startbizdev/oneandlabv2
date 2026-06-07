import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import type { AssigneeReviewSummary } from './assignee-review-display';
import {
  assigneeCreatorOriginVisible,
  creatorOriginName,
  creatorOriginSubtitle,
  creatorOriginTitle,
  isPatientPlatformOrigin,
  isViewerAppointmentCreator,
  resolveCreatorOriginProfileSheet,
  type AssigneeProfileSheetState,
  type CreatorOrigin,
} from './provider-public-profile';
import {
  assigneeReviewFromPrefix,
  creatorOriginReviewSummary,
} from './assignee-review-display';
import { appointmentAssigneeGender } from './patient-appointment-display';

type AptExt = Appointment & Record<string, unknown>;

export type AssigneeEntry = {
  id: string;
  /** Titre du poste (ex. Infirmier(e), Laboratoire). */
  title: string;
  name: string;
  profileImageUrl?: string | null;
  gender?: string | null;
  phone?: string;
  subtitle?: string;
  reviewSummary?: AssigneeReviewSummary | null;
  brandLogo?: 'cary';
  onViewProfile?: () => void;
};

export type BuildAssigneeEntriesOptions = {
  apt: Appointment;
  viewerRole: string;
  viewerId?: string | null;
  onOpenProviderSheet: (
    providerType: 'nurse' | 'lab',
    slug: string,
    title: string,
    phone?: string,
  ) => void;
  onOpenProfileSheet: (sheet: AssigneeProfileSheetState) => void;
};

function viewerFlags(ext: AptExt, viewerId?: string | null, viewerRole?: string) {
  return {
    hideNurse: viewerRole === 'nurse' && String(ext.assigned_nurse_id ?? '') === String(viewerId ?? ''),
    hideLab:
      (viewerRole === 'lab' || viewerRole === 'subaccount') &&
      String(ext.assigned_lab_id ?? '') === String(viewerId ?? ''),
    hidePreleveur:
      viewerRole === 'preleveur' && String(ext.assigned_to ?? '') === String(viewerId ?? ''),
    hideCreatorOrigin: isViewerAppointmentCreator(ext, viewerId),
  };
}

export function hasAssigneeContent(
  apt: Appointment,
  viewerRole: string,
  viewerId?: string | null,
): boolean {
  return buildAssigneeEntries({
    apt,
    viewerRole,
    viewerId,
    onOpenProviderSheet: () => {},
    onOpenProfileSheet: () => {},
  }).length > 0;
}

export function buildAssigneeEntries({
  apt,
  viewerRole,
  viewerId,
  onOpenProviderSheet,
  onOpenProfileSheet,
}: BuildAssigneeEntriesOptions): AssigneeEntry[] {
  const ext = apt as AptExt;
  const { hideNurse, hideLab, hidePreleveur, hideCreatorOrigin } = viewerFlags(
    ext,
    viewerId,
    viewerRole,
  );

  const entries: AssigneeEntry[] = [];

  const nurseName = String(ext.assigned_nurse_display_name ?? '').trim();
  if (isNursingAppointment(apt.type) && !hideNurse && (nurseName || ext.assigned_nurse_id)) {
    const slug = String(ext.assigned_nurse_public_slug ?? '').trim();
    entries.push({
      id: 'nurse',
      title: 'Infirmier(e)',
      name: nurseName || 'Assigné',
      profileImageUrl: String(ext.assigned_nurse_profile_image_url ?? '') || null,
      gender: appointmentAssigneeGender(apt, 'nurse'),
      phone: String(ext.assigned_nurse_phone ?? ''),
      reviewSummary: assigneeReviewFromPrefix(ext, 'assigned_nurse'),
      onViewProfile: slug
        ? () =>
            onOpenProviderSheet(
              'nurse',
              slug,
              nurseName || 'Infirmier',
              String(ext.assigned_nurse_phone ?? ''),
            )
        : undefined,
    });
  }

  const labName = String(ext.assigned_lab_display_name ?? '').trim();
  if (isBloodTestAppointment(apt.type) && !hideLab && (labName || ext.assigned_lab_id)) {
    const slug = String(ext.assigned_lab_public_slug ?? '').trim();
    entries.push({
      id: 'lab',
      title: 'Laboratoire',
      name: labName || 'Assigné',
      profileImageUrl: String(ext.assigned_lab_profile_image_url ?? '') || null,
      gender: appointmentAssigneeGender(apt, 'lab'),
      phone: String(ext.assigned_lab_phone ?? ''),
      reviewSummary: assigneeReviewFromPrefix(ext, 'assigned_lab'),
      onViewProfile: slug
        ? () =>
            onOpenProviderSheet(
              'lab',
              slug,
              labName || 'Laboratoire',
              String(ext.assigned_lab_phone ?? ''),
            )
        : undefined,
    });
  }

  const preleveurName = String(ext.assigned_to_display_name ?? '').trim();
  if (
    isBloodTestAppointment(apt.type) &&
    !hidePreleveur &&
    (preleveurName || ext.assigned_to)
  ) {
    entries.push({
      id: 'preleveur',
      title: 'Préleveur',
      name: preleveurName || 'Assigné',
      profileImageUrl: String(ext.assigned_to_profile_image_url ?? '') || null,
      gender: appointmentAssigneeGender(apt, 'preleveur'),
      phone: String(ext.assigned_preleveur_phone ?? ext.assigned_to_phone ?? ''),
      reviewSummary: assigneeReviewFromPrefix(ext, 'assigned_to'),
    });
  }

  const creator = ext.creator_origin as CreatorOrigin | undefined;
  const showCreatorOrigin = assigneeCreatorOriginVisible(creator, viewerRole, hideCreatorOrigin);

  if (showCreatorOrigin && creator) {
    const platformOriginRow = isPatientPlatformOrigin(creator);
    const profileSheet = resolveCreatorOriginProfileSheet(creator);
    entries.push({
      id: 'creator',
      title: creatorOriginTitle(creator, viewerRole),
      name: creatorOriginName(creator),
      profileImageUrl: platformOriginRow ? null : creator.profile_image_url,
      brandLogo: platformOriginRow ? 'cary' : undefined,
      phone: creator.phone,
      subtitle: creatorOriginSubtitle(creator, viewerRole),
      reviewSummary: creatorOriginReviewSummary(creator as Record<string, unknown>),
      onViewProfile: profileSheet ? () => onOpenProfileSheet(profileSheet) : undefined,
    });
  }

  return entries;
}
