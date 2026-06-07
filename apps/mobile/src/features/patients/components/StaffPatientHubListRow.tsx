import type { StaffHubSearchItem } from '@oneandlab/shared-types';
import { ageFromBirthDate } from '@oneandlab/shared-utils';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { ProfileNavRow } from '@/features/profile/components/ProfileNavRow';
import { hubDocumentVisual, hubExchangeVisual } from '../utils/staff-hub-item-visual';

interface Props {
  item: StaffHubSearchItem;
  onPress: () => void;
  onLongPress?: () => void;
}

function titleForItem(item: StaffHubSearchItem): string {
  if (item.kind === 'patient') {
    return `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() || 'Patient';
  }
  if (item.kind === 'document') return item.title;
  return item.patient_name;
}

function subtitleForItem(item: StaffHubSearchItem): string {
  if (item.kind === 'patient') return item.subtitle?.trim() || 'Patient';
  if (item.kind === 'document') return item.subtitle?.trim() || item.patient_name;
  const msg = item.last_message?.trim();
  return msg ? `${item.counterpart_name} · ${msg}` : item.counterpart_name;
}

function ageSuffix(item: StaffHubSearchItem): string | undefined {
  if (item.kind !== 'patient' || !item.birth_date) return undefined;
  const age = ageFromBirthDate(item.birth_date);
  return age != null ? ` · ${age} ans` : undefined;
}

/** Ligne hub Patients — avatar patient + icônes colorées par type. */
export function StaffPatientHubListRow({ item, onPress, onLongPress }: Props) {
  const title = titleForItem(item);
  const subtitle = subtitleForItem(item);

  if (item.kind === 'patient') {
    return (
      <ProfileNavRow
        leading={
          <ProfileAvatar
            profileImageUrl={item.profile_image_url}
            seed={item.patient_id}
            gender={item.gender}
            size={40}
          />
        }
        title={title}
        titleSuffix={ageSuffix(item)}
        subtitle={subtitle}
        onPress={onPress}
        onLongPress={onLongPress}
      />
    );
  }

  if (item.kind === 'document') {
    const visual = hubDocumentVisual(item.document_type);
    return (
      <ProfileNavRow
        icon={visual.Icon}
        iconColor={visual.iconColor}
        iconBg={visual.iconBg}
        title={title}
        subtitle={subtitle}
        onPress={onPress}
      />
    );
  }

  const visual = hubExchangeVisual();
  return (
    <ProfileNavRow
      icon={visual.Icon}
      iconColor={visual.iconColor}
      iconBg={visual.iconBg}
      title={title}
      subtitle={subtitle}
      onPress={onPress}
    />
  );
}
