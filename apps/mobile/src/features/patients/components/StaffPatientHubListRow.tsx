import { iconSize } from '@/theme';
import type { StaffHubSearchItem } from '@oneandlab/shared-types';
import { ageFromBirthDate } from '@oneandlab/shared-utils';
import type { LucideIcon } from 'lucide-react-native';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { HUB_EXCHANGE_ICON, HUB_RELATIVE_ICON, hubDocumentIcon } from '../utils/staff-hub-item-visual';

interface Props {
  item: StaffHubSearchItem;
  onPress: () => void;
  onLongPress?: () => void;
}

function titleForItem(item: StaffHubSearchItem): string {
  if (item.kind === 'patient') {
    return `${item.first_name ?? ''} ${item.last_name ?? ''}`.trim() || 'Patient';
  }
  if (item.kind === 'relative') return item.relative_name || 'Proche';
  if (item.kind === 'document') return item.title;
  return item.patient_name;
}

function subtitleForItem(item: StaffHubSearchItem): string {
  if (item.kind === 'patient') return item.subtitle?.trim() || 'Patient';
  if (item.kind === 'relative') return item.subtitle?.trim() || `Proche de ${item.patient_name}`;
  if (item.kind === 'document') return item.subtitle?.trim() || item.patient_name;
  const msg = item.last_message?.trim();
  return msg ? `${item.counterpart_name} · ${msg}` : item.counterpart_name;
}

function ageSuffix(item: StaffHubSearchItem): string | undefined {
  if (item.kind !== 'patient' || !item.birth_date) return undefined;
  const age = ageFromBirthDate(item.birth_date);
  return age != null ? ` · ${age} ans` : undefined;
}

function iconForItem(item: Exclude<StaffHubSearchItem, { kind: 'patient' }>): LucideIcon {
  if (item.kind === 'document') return hubDocumentIcon(item.document_type);
  if (item.kind === 'relative') return HUB_RELATIVE_ICON;
  return HUB_EXCHANGE_ICON;
}

/** Ligne hub Patients : avatar pour un patient, icône neutre pour proche, document ou échange. */
export function StaffPatientHubListRow({ item, onPress, onLongPress }: Props) {
  const title = titleForItem(item);
  const subtitle = subtitleForItem(item);

  if (item.kind === 'patient') {
    return (
      <SettingsRow
        leading={
          <ProfileAvatar
            profileImageUrl={item.profile_image_url}
            seed={item.patient_id}
            gender={item.gender}
            size={iconSize['2xl']}
          />
        }
        label={title}
        labelSuffix={ageSuffix(item)}
        description={subtitle}
        onPress={onPress}
        onLongPress={onLongPress}
      />
    );
  }

  return (
    <SettingsRow
      icon={iconForItem(item)}
      label={title}
      description={subtitle}
      onPress={onPress}
    />
  );
}
