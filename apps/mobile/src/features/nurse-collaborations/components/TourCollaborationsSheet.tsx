import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { SheetModal } from '@/components/ui/SheetModal';
import { SkeletonList } from '@/components/ui/skeletons';
import { useAfterSheetDismiss } from '@/components/ui/sheet/use-after-sheet-dismiss';
import { spacing } from '@/theme';
import type { NurseCollaboration } from '@oneandlab/shared-types';
import { useNurseCollaborations } from '../hooks/use-nurse-collaborations';
import { CoNurseAddSheet } from './CoNurseAddSheet';
import { collaborationRowProps, useCollaborationRemoval } from './collaboration-rows';

type Props = {
  visible: boolean;
  onClose: () => void;
  viewerId: string | null | undefined;
  /** Jour affiché dans la tournée : début proposé du remplacement. */
  date: string;
};

/** Tournée : mes partages actifs et « Ajouter un confrère » sur une période (remplacement). */
export function TourCollaborationsSheet({ visible, onClose, viewerId, date }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const collaborationsQ = useNurseCollaborations(undefined, visible);
  const { confirmRemove, removingId } = useCollaborationRemoval(viewerId);
  const { closeThen, onDismissed } = useAfterSheetDismiss(onClose);
  const onRemove = (item: NurseCollaboration) => confirmRemove(item);
  const items = collaborationsQ.data ?? [];

  return (
    <>
      <SheetModal
        visible={visible}
        onClose={onClose}
        onDismissed={onDismissed}
        title="Confrères"
        footer={
          <Button title="Ajouter un confrère" fullWidth onPress={() => closeThen(() => setAddOpen(true))} />
        }
      >
        {collaborationsQ.isLoading ? (
          <SkeletonList count={3} itemHeight={56} gap={spacing[2]} />
        ) : collaborationsQ.isError && !collaborationsQ.data ? (
          <ErrorState
            title="Confrères indisponibles"
            error={collaborationsQ.error}
            onRetry={() => void collaborationsQ.refetch()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            illustration="patients"
            title="Aucun partage en cours"
            description="Un confrère peut vous remplacer sur une période."
          />
        ) : (
          <SettingsSection>
            {items.map((item) => (
              <SettingsRow key={item.id} {...collaborationRowProps(item, viewerId, { removingId, onRemove })} />
            ))}
          </SettingsSection>
        )}
      </SheetModal>
      <CoNurseAddSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        defaultDate={date}
        excludeIds={viewerId ? [viewerId] : []}
      />
    </>
  );
}
