import { ConfirmSheet } from '@/components/ui/ConfirmSheet';

type Props = {
  /** Nom affiché du patient à supprimer ; `null` ferme la feuille. */
  patientName: string | null;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** Conséquences alignées sur `DELETE /patients/{id}` (suppression définitive, refus si RDV en attente ou en cours). */
export function DeletePatientConfirmSheet({ patientName, loading, onConfirm, onClose }: Props) {
  return (
    <ConfirmSheet
      visible={patientName !== null}
      title="Supprimer ce patient ?"
      message={`La fiche de ${patientName ?? 'ce patient'} sera définitivement supprimée. La suppression est refusée si un rendez-vous est en attente ou en cours.`}
      confirmLabel="Supprimer le patient"
      tone="destructive"
      loading={loading}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
