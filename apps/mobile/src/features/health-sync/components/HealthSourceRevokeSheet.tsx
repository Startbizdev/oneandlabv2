import { ConfirmSheet } from '@/components/ui/ConfirmSheet';

export type HealthSourceRevokeSheetProps = {
  visible: boolean;
  platformName: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** Confirmation de déconnexion d'Apple Santé / Health Connect (`DELETE /health/sources/{id}`). */
export function HealthSourceRevokeSheet({
  visible,
  platformName,
  loading,
  onConfirm,
  onClose,
}: HealthSourceRevokeSheetProps) {
  return (
    <ConfirmSheet
      visible={visible}
      title={`Déconnecter ${platformName} ?`}
      message="Cary ne lira plus vos données depuis cette source. Vous pourrez la reconnecter à tout moment."
      confirmLabel="Déconnecter"
      loading={loading}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
