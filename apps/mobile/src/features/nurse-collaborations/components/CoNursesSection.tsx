import { useState } from 'react';
import { RotateCcw, UserPlus } from 'lucide-react-native';
import { canAddCoNurse, isCoNurseViewer } from '@oneandlab/shared-utils';
import { SettingsRow, type SettingsRowProps } from '@/components/ui/SettingsRow';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { useNurseCollaborations } from '../hooks/use-nurse-collaborations';
import { CoNurseAddSheet } from './CoNurseAddSheet';
import { collaborationRowProps, useCollaborationRemoval } from './collaboration-rows';

type CoNurseApt = {
  id: string;
  status?: string | null;
  assigned_nurse_id?: string | null;
  is_co_nurse?: boolean;
  passage_series_id?: string | null;
};

type Props = {
  apt: CoNurseApt;
  viewerId: string | null | undefined;
  /** Fiche passage en série : propose « Toute la série ». */
  passageSeriesId?: string | null;
  /** Le confrère s'est retiré : il n'a plus accès à la fiche. */
  onSelfRemoved: () => void;
};

/** Fiche RDV / passage infirmier : confrères du binôme (titulaire) ou mention du partage (confrère). */
export function CoNursesSection({ apt, viewerId, passageSeriesId, onSelfRemoved }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const guest = isCoNurseViewer(apt);
  const canAdd = canAddCoNurse(apt, viewerId);
  const collaborationsQ = useNurseCollaborations(apt.id, guest || canAdd);
  const { confirmRemove, removingId } = useCollaborationRemoval(viewerId, apt.id);

  if (!guest && !canAdd) return null;

  const items = (collaborationsQ.data ?? []).filter((item) => !guest || item.co_nurse_id === viewerId);
  const onRemove = (item: (typeof items)[number]) => confirmRemove(item, onSelfRemoved);

  const rows: Array<SettingsRowProps & { key: string }> = items.map((item) => ({
    key: item.id,
    ...collaborationRowProps(item, viewerId, { removingId, onRemove }),
  }));

  if (collaborationsQ.isError && !collaborationsQ.data) {
    rows.push({
      key: 'retry',
      icon: RotateCcw,
      label: 'Confrères indisponibles',
      description: 'Toucher pour réessayer',
      inlineAction: true,
      onPress: () => void collaborationsQ.refetch(),
    });
  }

  if (canAdd) {
    rows.push({
      key: 'add',
      icon: UserPlus,
      label: 'Ajouter un confrère',
      inlineAction: true,
      onPress: () => setAddOpen(true),
    });
  }

  if (rows.length === 0) return null;

  return (
    <>
      <SettingsSection title="Infirmiers">
        {rows.map(({ key, ...row }) => (
          <SettingsRow key={key} {...row} />
        ))}
      </SettingsSection>
      {canAdd ? (
        <CoNurseAddSheet
          visible={addOpen}
          onClose={() => setAddOpen(false)}
          appointmentId={apt.id}
          passageSeriesId={passageSeriesId ?? apt.passage_series_id}
          allowRange={false}
          excludeIds={viewerId ? [viewerId] : []}
        />
      ) : null}
    </>
  );
}
