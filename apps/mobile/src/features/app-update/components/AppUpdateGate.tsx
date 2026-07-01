import { ForceAppUpdateModal } from '@/features/app-update/components/ForceAppUpdateModal';
import { useAppUpdateGate } from '@/features/app-update/hooks/use-app-update-gate';

/** Bloque l’app si une mise à jour store obligatoire est requise. */
export function AppUpdateGate() {
  const { requirement, updateState, dismissOptional } = useAppUpdateGate();

  if (!updateState || requirement === 'none') return null;

  const force = requirement === 'force';

  return (
    <ForceAppUpdateModal
      visible
      force={force}
      message={updateState.message}
      storeUrl={updateState.storeUrl}
      onDismiss={force ? undefined : () => void dismissOptional()}
    />
  );
}
