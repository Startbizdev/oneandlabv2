import { cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from 'react';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { useAuthStore } from '@/store/auth-store';
import { Card } from '@/components/ui/Card';
import { AssigneeProfileRow } from './AssigneeProfileRow';
import { AssigneeProfileSheets } from './AssigneeProfileSheets';
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
} from '../utils/provider-public-profile';
import { appointmentAssigneeGender } from '../utils/patient-appointment-display';
import { colors, spacing } from '@/theme';
import { StyleSheet } from 'react-native';

type AptExt = Appointment & Record<string, unknown>;


export function hasAssigneeContent(apt: Appointment, role: string): boolean {
  const user = useAuthStore.getState().user;
  const ext = apt as AptExt;

  const hideNurse =
    user?.role === 'nurse' && String(ext.assigned_nurse_id ?? '') === String(user.id ?? '');
  const hideLab =
    (user?.role === 'lab' || user?.role === 'subaccount') &&
    String(ext.assigned_lab_id ?? '') === String(user?.id ?? '');
  const hidePreleveur =
    user?.role === 'preleveur' && String(ext.assigned_to ?? '') === String(user.id ?? '');

  const nurseName = String(ext.assigned_nurse_display_name ?? '').trim();
  const labName = String(ext.assigned_lab_display_name ?? '').trim();
  const preleveurName = String(ext.assigned_to_display_name ?? '').trim();
  const creator = ext.creator_origin as CreatorOrigin | undefined;
  const platformOrigin = String(ext.patient_platform_origin_display ?? '').trim();
  const hideCreatorOrigin = isViewerAppointmentCreator(apt, user?.id);

  const showNurse =
    isNursingAppointment(apt.type) && !hideNurse && (nurseName || ext.assigned_nurse_id);
  const showLab =
    isBloodTestAppointment(apt.type) && !hideLab && (labName || ext.assigned_lab_id);
  const showPreleveur =
    isBloodTestAppointment(apt.type) &&
    !hidePreleveur &&
    (preleveurName || ext.assigned_to);
  const showCreatorOrigin = assigneeCreatorOriginVisible(creator, role, hideCreatorOrigin);
  const showPlatform = assigneePlatformOriginVisible(creator, platformOrigin, role);

  return Boolean(showNurse || showLab || showPreleveur || showCreatorOrigin || showPlatform);
}

export function RdvAssigneeSection({ apt, role }: { apt: Appointment; role: string }) {
  const user = useAuthStore((s) => s.user);
  const ext = apt as AptExt;
  const [sheet, setSheet] = useState<AssigneeProfileSheetState | null>(null);

  const hideNurse =
    user?.role === 'nurse' && String(ext.assigned_nurse_id ?? '') === String(user.id ?? '');
  const hideLab =
    (user?.role === 'lab' || user?.role === 'subaccount') &&
    String(ext.assigned_lab_id ?? '') === String(user?.id ?? '');
  const hidePreleveur =
    user?.role === 'preleveur' && String(ext.assigned_to ?? '') === String(user.id ?? '');

  const nurseName = String(ext.assigned_nurse_display_name ?? '').trim();
  const labName = String(ext.assigned_lab_display_name ?? '').trim();
  const preleveurName = String(ext.assigned_to_display_name ?? '').trim();
  const creator = ext.creator_origin as CreatorOrigin | undefined;
  const platformOrigin = String(ext.patient_platform_origin_display ?? '').trim();
  const hideCreatorOrigin = isViewerAppointmentCreator(apt, user?.id);

  const showNurse =
    isNursingAppointment(apt.type) && !hideNurse && (nurseName || ext.assigned_nurse_id);
  const showLab =
    isBloodTestAppointment(apt.type) && !hideLab && (labName || ext.assigned_lab_id);
  const showPreleveur =
    isBloodTestAppointment(apt.type) &&
    !hidePreleveur &&
    (preleveurName || ext.assigned_to);
  const showCreatorOrigin = assigneeCreatorOriginVisible(creator, role, hideCreatorOrigin);
  const showPlatform = assigneePlatformOriginVisible(creator, platformOrigin, role);

  if (!showNurse && !showLab && !showPreleveur && !showCreatorOrigin && !showPlatform) {
    return null;
  }

  const openProviderSheet = (
    providerType: 'nurse' | 'lab',
    slug: string,
    title: string,
    phone?: string,
  ) => setSheet({ kind: 'provider', providerType, slug, title, phone: phone || null });

  const rows: ReactNode[] = [];

  if (showNurse) {
    const slug = String(ext.assigned_nurse_public_slug ?? '').trim();
    rows.push(
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
      />,
    );
  }
  if (showLab) {
    const slug = String(ext.assigned_lab_public_slug ?? '').trim();
    rows.push(
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
      />,
    );
  }
  if (showPreleveur) {
    rows.push(
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
  if (showCreatorOrigin && creator) {
    const name = creatorOriginName(creator);
    const title = creatorOriginTitle(creator, role);
    const platformOrigin = isPatientPlatformOrigin(creator);
    const profileSheet = resolveCreatorOriginProfileSheet(creator);
    rows.push(
      <AssigneeProfileRow
        key="creator"
        title={title}
        name={name}
        profileImageUrl={platformOrigin ? null : creator.profile_image_url}
        brandLogo={platformOrigin ? 'cary' : undefined}
        phone={creator.phone}
        subtitle={creatorOriginSubtitle(creator, role)}
        publicSlug={creator.public_slug?.trim() || null}
        onViewProfile={profileSheet ? () => setSheet(profileSheet) : undefined}
      />,
    );
  }
  if (showPlatform) {
    rows.push(
      <AssigneeProfileRow
        key="platform"
        title="Origine"
        name={platformOriginDisplayName(platformOrigin)}
        brandLogo="cary"
        subtitle="Ce rendez-vous a été pris en direct par le patient"
      />,
    );
  }

  return (
    <>
      <Card shadow="sm" padding="md" style={styles.card}>
        {rows.map((row, index) =>
          isValidElement(row)
            ? cloneElement(row as ReactElement<{ showDivider?: boolean }>, {
                showDivider: index < rows.length - 1,
              })
            : row,
        )}
      </Card>
      <AssigneeProfileSheets sheet={sheet} onClose={() => setSheet(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[2],
  },
});
