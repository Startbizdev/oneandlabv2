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

function normalizedId(value: unknown): string {
  return String(value ?? '').trim();
}

function creatorPersonId(ext: AptExt): string {
  const creator = ext.creator_origin as CreatorOrigin | undefined;
  return normalizedId(creator?.id ?? ext.created_by);
}

type AssigneeSlot = 'nurse' | 'lab' | 'preleveur';

function assigneePersonId(ext: AptExt, slot: AssigneeSlot): string {
  switch (slot) {
    case 'nurse':
      return normalizedId(ext.assigned_nurse_id);
    case 'lab':
      return normalizedId(ext.assigned_lab_id);
    case 'preleveur':
      return normalizedId(ext.assigned_to);
  }
}

/** Créateur et assigné = même personne sur ce créneau. */
function assigneeSlotMergedWithCreator(ext: AptExt, slot: AssigneeSlot): boolean {
  const creatorId = creatorPersonId(ext);
  const assigneeId = assigneePersonId(ext, slot);
  return Boolean(creatorId && assigneeId && creatorId === assigneeId);
}

function viewerIsCreatorAndAssignee(
  ext: AptExt,
  viewerId?: string | null,
): boolean {
  const viewer = normalizedId(viewerId);
  if (!viewer || !isViewerAppointmentCreator(ext, viewerId)) return false;

  const creatorId = creatorPersonId(ext);
  if (creatorId !== viewer) return false;

  return (
    assigneeSlotMergedWithCreator(ext, 'nurse') ||
    assigneeSlotMergedWithCreator(ext, 'lab') ||
    assigneeSlotMergedWithCreator(ext, 'preleveur')
  );
}

function viewerFlags(ext: AptExt, viewerId?: string | null, viewerRole?: string) {
  return {
    hideNurse:
      viewerRole === 'nurse' &&
      assigneePersonId(ext, 'nurse') === normalizedId(viewerId),
    hideLab:
      (viewerRole === 'lab' || viewerRole === 'subaccount') &&
      assigneePersonId(ext, 'lab') === normalizedId(viewerId),
    hidePreleveur:
      viewerRole === 'preleveur' &&
      assigneePersonId(ext, 'preleveur') === normalizedId(viewerId),
    hideCreatorOrigin: isViewerAppointmentCreator(ext, viewerId),
  };
}

function mergedAssigneeTitle(slot: AssigneeSlot): string {
  switch (slot) {
    case 'nurse':
      return 'Infirmier(e) assigné(e)';
    case 'lab':
      return 'Laboratoire assigné';
    case 'preleveur':
      return 'Préleveur assigné';
  }
}

function personIdsOnEntries(ext: AptExt, entries: AssigneeEntry[]): Set<string> {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (entry.id === 'nurse') {
      const id = assigneePersonId(ext, 'nurse');
      if (id) ids.add(id);
    } else if (entry.id === 'lab') {
      const id = assigneePersonId(ext, 'lab');
      if (id) ids.add(id);
    } else if (entry.id === 'preleveur') {
      const id = assigneePersonId(ext, 'preleveur');
      if (id) ids.add(id);
    } else if (entry.id === 'creator') {
      const id = creatorPersonId(ext);
      if (id) ids.add(id);
    }
  }
  return ids;
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

  if (viewerIsCreatorAndAssignee(ext, viewerId)) {
    return [];
  }

  const { hideNurse, hideLab, hidePreleveur, hideCreatorOrigin } = viewerFlags(
    ext,
    viewerId,
    viewerRole,
  );

  const entries: AssigneeEntry[] = [];

  const nurseName = String(ext.assigned_nurse_display_name ?? '').trim();
  const nurseId = assigneePersonId(ext, 'nurse');
  const nurseMergedWithCreator = assigneeSlotMergedWithCreator(ext, 'nurse');

  if (isNursingAppointment(apt.type) && !hideNurse && (nurseName || nurseId)) {
    const slug = String(ext.assigned_nurse_public_slug ?? '').trim();
    entries.push({
      id: 'nurse',
      title: nurseMergedWithCreator ? mergedAssigneeTitle('nurse') : 'Infirmier(e)',
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
  const labId = assigneePersonId(ext, 'lab');
  const labMergedWithCreator = assigneeSlotMergedWithCreator(ext, 'lab');

  if (isBloodTestAppointment(apt.type) && !hideLab && (labName || labId)) {
    const slug = String(ext.assigned_lab_public_slug ?? '').trim();
    entries.push({
      id: 'lab',
      title: labMergedWithCreator ? mergedAssigneeTitle('lab') : 'Laboratoire',
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
  const preleveurId = assigneePersonId(ext, 'preleveur');
  const preleveurMergedWithCreator = assigneeSlotMergedWithCreator(ext, 'preleveur');

  if (
    isBloodTestAppointment(apt.type) &&
    !hidePreleveur &&
    (preleveurName || preleveurId)
  ) {
    entries.push({
      id: 'preleveur',
      title: preleveurMergedWithCreator
        ? mergedAssigneeTitle('preleveur')
        : 'Préleveur',
      name: preleveurName || 'Assigné',
      profileImageUrl: String(ext.assigned_to_profile_image_url ?? '') || null,
      gender: appointmentAssigneeGender(apt, 'preleveur'),
      phone: String(ext.assigned_preleveur_phone ?? ext.assigned_to_phone ?? ''),
      reviewSummary: assigneeReviewFromPrefix(ext, 'assigned_to'),
    });
  }

  const creator = ext.creator_origin as CreatorOrigin | undefined;
  const showCreatorOrigin = assigneeCreatorOriginVisible(creator, viewerRole, hideCreatorOrigin);
  const coveredPersonIds = personIdsOnEntries(ext, entries);
  const creatorId = creatorPersonId(ext);

  if (showCreatorOrigin && creator) {
    const alreadyListed =
      Boolean(creatorId && coveredPersonIds.has(creatorId)) ||
      assigneeSlotMergedWithCreator(ext, 'nurse') ||
      assigneeSlotMergedWithCreator(ext, 'lab') ||
      assigneeSlotMergedWithCreator(ext, 'preleveur');

    if (!alreadyListed) {
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
  }

  return entries;
}
