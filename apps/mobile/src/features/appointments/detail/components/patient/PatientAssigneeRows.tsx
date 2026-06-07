import { useState } from 'react';
import type { Appointment } from '@oneandlab/shared-types';
import { useAuthStore } from '@/store/auth-store';
import { AssigneeProfileRow } from '../AssigneeProfileRow';
import { AssigneeProfileSheets } from '../AssigneeProfileSheets';
import { DetailSection } from '../layout/DetailSection';
import {
  buildAssigneeEntries,
  hasAssigneeContent,
} from '../../utils/build-assignee-entries';
import type { AssigneeProfileSheetState } from '../../utils/provider-public-profile';

export { hasAssigneeContent };

interface Props {
  apt: Appointment;
}

export function PatientAssigneeRows({ apt }: Props) {
  const user = useAuthStore((s) => s.user);
  const [sheet, setSheet] = useState<AssigneeProfileSheetState | null>(null);

  const viewerRole = user?.role ?? 'patient';
  if (!hasAssigneeContent(apt, viewerRole, user?.id)) return null;

  const entries = buildAssigneeEntries({
    apt,
    viewerRole,
    viewerId: user?.id,
    onOpenProviderSheet: (providerType, slug, title, phone) =>
      setSheet({ kind: 'provider', providerType, slug, title, phone: phone || null }),
    onOpenProfileSheet: setSheet,
  });

  if (!entries.length) return null;

  return (
    <>
      <DetailSection compact>
        {entries.map((entry, index) => (
          <AssigneeProfileRow
            key={entry.id}
            title={entry.title}
            name={entry.name}
            profileImageUrl={entry.profileImageUrl}
            gender={entry.gender}
            phone={entry.phone}
            subtitle={entry.subtitle}
            reviewSummary={entry.reviewSummary}
            brandLogo={entry.brandLogo}
            onViewProfile={entry.onViewProfile}
            showDivider={index < entries.length - 1}
          />
        ))}
      </DetailSection>
      <AssigneeProfileSheets sheet={sheet} onClose={() => setSheet(null)} />
    </>
  );
}
