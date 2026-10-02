import { useHasOpenSheet } from '@/components/ui/sheet/sheet-store';
import { ForceAppUpdateModal } from '@/features/app-update/components/ForceAppUpdateModal';
import { OptionalAppUpdateSheet } from '@/features/app-update/components/OptionalAppUpdateSheet';
import { useAppUpdateGate } from '@/features/app-update/hooks/use-app-update-gate';

/** Mise à jour obligatoire : bloque l'app. Facultative : feuille fermable. */
export function AppUpdateGate() {
  const { requirement, updateState, dismissOptional } = useAppUpdateGate();
  /** iOS ne présente pas un `Modal` par-dessus une sheet native : le blocage s'affiche une fois les sheets fermées. */
  const sheetOpen = useHasOpenSheet();

  if (!updateState || requirement === 'none') return null;

  if (requirement === 'force') {
    return sheetOpen ? null : (
      <ForceAppUpdateModal
        message={updateState.message}
        storeUrl={updateState.storeUrl}
        latestVersion={updateState.latestVersion}
      />
    );
  }

  return (
    <OptionalAppUpdateSheet
      message={updateState.message}
      storeUrl={updateState.storeUrl}
      latestVersion={updateState.latestVersion}
      onDismiss={() => void dismissOptional()}
    />
  );
}
