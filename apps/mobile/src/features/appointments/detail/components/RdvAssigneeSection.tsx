import { cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from 'react';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { useAuthStore } from '@/store/auth-store';
import { Card } from '@/components/ui/Card';
import { AssigneeProfileRow } from './AssigneeProfileRow';
import { ProviderPublicProfileSheet } from './ProviderPublicProfileSheet';
import { appointmentAssigneeGender } from '../utils/patient-appointment-display';
import {
  creatorOriginName,
  creatorOriginSubtitle,
  creatorOriginTitle,
  isPatientPlatformOrigin,
  isViewerAppointmentCreator,
  type CreatorOrigin,
} from '../utils/provider-public-profile';
import { colors, spacing } from '@/theme';
import { StyleSheet } from 'react-native';

type AptExt = Appointment & Record<string, unknown>;

type SheetTarget = { type: 'nurse' | 'lab'; slug: string; title: string } | null;

export function hasAssigneeContent(apt: Appointment, role: string): boolean {
  const user = useAuthStore.getState().user;
  const ext = apt as AptExt;
  const isPatient = role === 'patient';

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
  const showCreatorOrigin =
    Boolean(creator?.kind) && !isPatient && !hideCreatorOrigin;
  const showPlatform = isPatient && platformOrigin && !creator?.kind;

  return Boolean(showNurse || showLab || showPreleveur || showCreatorOrigin || showPlatform);
}

export function RdvAssigneeSection({ apt, role }: { apt: Appointment; role: string }) {
  const user = useAuthStore((s) => s.user);
  const ext = apt as AptExt;
  const isPatient = role === 'patient';
  const [sheet, setSheet] = useState<SheetTarget>(null);

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
  const showCreatorOrigin = Boolean(creator?.kind) && !isPatient && !hideCreatorOrigin;
  const showPlatform = isPatient && platformOrigin && !creator?.kind;

  if (!showNurse && !showLab && !showPreleveur && !showCreatorOrigin && !showPlatform) {
    return null;
  }

  const openSheet = (type: 'nurse' | 'lab', slug: string, title: string) =>
    setSheet({ type, slug, title });

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
        onViewProfile={slug ? () => openSheet('nurse', slug, nurseName || 'Infirmier') : undefined}
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
        onViewProfile={slug ? () => openSheet('lab', slug, labName || 'Laboratoire') : undefined}
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
    const title = creatorOriginTitle(creator);
    const slug = creator.public_slug?.trim();
    const platformOrigin = isPatientPlatformOrigin(creator);
    const providerType =
      creator.kind === 'lab_team' ? 'lab' : creator.kind === 'nurse' ? 'nurse' : null;
    rows.push(
      <AssigneeProfileRow
        key="creator"
        title={title}
        name={name}
        profileImageUrl={platformOrigin ? null : creator.profile_image_url}
        brandLogo={platformOrigin ? 'cary' : undefined}
        phone={creator.phone}
        subtitle={creatorOriginSubtitle(creator)}
        publicSlug={slug || null}
        onViewProfile={
          slug && providerType ? () => openSheet(providerType, slug, name) : undefined
        }
      />,
    );
  }
  if (showPlatform) {
    rows.push(<AssigneeProfileRow key="platform" title="Origine" name={platformOrigin} />);
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

const styles = StyleSheet.create({
  card: {
    gap: spacing[2],
  },
});
