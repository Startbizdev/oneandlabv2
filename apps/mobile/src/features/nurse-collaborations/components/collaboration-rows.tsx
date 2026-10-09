import { Alert } from 'react-native';
import type { NurseCollaboration } from '@oneandlab/shared-types';
import { nurseCollaborationRowCopy, nurseCollaborationScopeSummary } from '@oneandlab/shared-utils';
import { Button } from '@/components/ui/Button';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import type { SettingsRowProps } from '@/components/ui/SettingsRow';
import { iconSize } from '@/theme';
import { useRemoveNurseCollaboration } from '../hooks/use-nurse-collaborations';

/** Retrait confirmé d'une collaboration ; `onSelfRemoved` quand le confrère se retire lui-même. */
export function useCollaborationRemoval(viewerId: string | null | undefined, appointmentId?: string) {
  const removeMut = useRemoveNurseCollaboration(appointmentId);

  const confirmRemove = (item: NurseCollaboration, onSelfRemoved?: () => void) => {
    const copy = nurseCollaborationRowCopy(item, viewerId);
    Alert.alert(copy.confirmTitle, copy.confirmMessage, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Retirer',
        style: 'destructive',
        onPress: () => removeMut.mutate(item.id, { onSuccess: copy.guest ? onSelfRemoved : undefined }),
      },
    ]);
  };

  return {
    confirmRemove,
    removingId: removeMut.isPending ? removeMut.variables : undefined,
  };
}

export function collaborationRowProps(
  item: NurseCollaboration,
  viewerId: string | null | undefined,
  removal: { removingId?: string; onRemove: (item: NurseCollaboration) => void },
): SettingsRowProps {
  const copy = nurseCollaborationRowCopy(item, viewerId);
  return {
    leading: (
      <ProfileAvatar
        profileImageUrl={copy.guest ? null : item.co_nurse_profile_image_url}
        seed={copy.guest ? item.owner_nurse_id : item.co_nurse_id}
        size={iconSize['2xl']}
      />
    ),
    label: copy.title,
    description: nurseCollaborationScopeSummary(item),
    trailing: item.can_remove ? (
      <Button
        title={copy.removeLabel}
        size="sm"
        variant="muted"
        loading={removal.removingId === item.id}
        onPress={() => removal.onRemove(item)}
      />
    ) : undefined,
  };
}
