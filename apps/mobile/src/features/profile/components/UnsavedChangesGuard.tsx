import { useState } from 'react';
import { usePreventRemove, useNavigation, type NavigationAction } from '@react-navigation/native';
import { ConfirmSheet } from '@/components/ui/ConfirmSheet';

interface Props {
  /** Modifications locales non enregistrées. */
  dirty: boolean;
}

/** Demande confirmation avant de quitter un formulaire modifié (retour, geste, bouton système). */
export function UnsavedChangesGuard({ dirty }: Props) {
  const navigation = useNavigation();
  const [pendingAction, setPendingAction] = useState<NavigationAction | null>(null);

  usePreventRemove(dirty, ({ data }) => setPendingAction(data.action));

  return (
    <ConfirmSheet
      visible={pendingAction !== null}
      title="Quitter sans enregistrer ?"
      message="Vos modifications seront perdues."
      confirmLabel="Quitter sans enregistrer"
      cancelLabel="Continuer la modification"
      onConfirm={() => {
        const action = pendingAction;
        setPendingAction(null);
        if (action) navigation.dispatch(action);
      }}
      onClose={() => setPendingAction(null)}
    />
  );
}
