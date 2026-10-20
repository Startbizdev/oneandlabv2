import { useEffect, useState } from 'react';
import { nurseCollaborationRowCopy } from '@oneandlab/shared-utils';
import { Stack } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SettingsRow } from '@/components/ui/SettingsRow';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { SheetModal } from '@/components/ui/SheetModal';
import { SkeletonList } from '@/components/ui/skeletons';
import { useAfterSheetDismiss } from '@/components/ui/sheet/use-after-sheet-dismiss';
import { AppText, spacing, useStyles } from '@/theme';
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
  const styles = useStyles(buildStyles);
  const [addOpen, setAddOpen] = useState(false);
  /** Retrait confirmé dans le pied de la sheet : pas d'Alert par-dessus une sheet ouverte. */
  const [pendingRemoval, setPendingRemoval] = useState<NurseCollaboration | null>(null);
  const collaborationsQ = useNurseCollaborations(undefined, visible);
  const { remove, removingId } = useCollaborationRemoval(viewerId);
  const { closeThen, onDismissed } = useAfterSheetDismiss(onClose);
  const items = collaborationsQ.data ?? [];
  const pendingCopy = pendingRemoval ? nurseCollaborationRowCopy(pendingRemoval, viewerId) : null;
  const removing = Boolean(removingId);

  useEffect(() => {
    if (!visible) setPendingRemoval(null);
  }, [visible]);

  return (
    <>
      <SheetModal
        visible={visible}
        onClose={onClose}
        onDismissed={onDismissed}
        title="Confrères"
        dismissible={!removing}
        footer={
          pendingRemoval && pendingCopy ? (
            <Stack gap={spacing[2]}>
              <AppText variant="headline" style={styles.confirmText}>
                {pendingCopy.confirmTitle}
              </AppText>
              <AppText variant="secondary" style={styles.confirmText}>
                {pendingCopy.confirmMessage}
              </AppText>
              <Button
                title={pendingCopy.removeLabel}
                variant="destructive"
                size="lg"
                fullWidth
                loading={removing}
                onPress={() => remove(pendingRemoval, { onSettled: () => setPendingRemoval(null) })}
              />
              <Button
                title="Annuler"
                variant="ghost"
                fullWidth
                disabled={removing}
                onPress={() => setPendingRemoval(null)}
              />
            </Stack>
          ) : (
            <Button title="Ajouter un confrère" fullWidth onPress={() => closeThen(() => setAddOpen(true))} />
          )
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
              <SettingsRow key={item.id} {...collaborationRowProps(item, viewerId, { removingId, onRemove: setPendingRemoval })} />
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

function buildStyles() {
  return {
    confirmText: { textAlign: 'center' as const },
  };
}
