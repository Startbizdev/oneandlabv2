import { useCallback, useState } from 'react';
import { BackHandler } from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  usePreventRemove,
  type NavigationAction,
} from '@react-navigation/native';

const BACK_ACTION_TYPES = new Set(['GO_BACK', 'POP', 'POP_TO_TOP']);

/**
 * Empêche de perdre une réservation en cours : un retour (geste iOS, bouton Android, chevron)
 * revient d'une étape, et quitter l'assistant depuis la première étape demande confirmation.
 * Aucun brouillon n'est conservé : le backend n'expose pas d'enregistrement de réservation en cours.
 */
export function useBookingLeaveGuard({
  enabled,
  canStepBack,
  onStepBack,
  embeddedInTab,
}: {
  /** Saisie en cours, pas de création en vol ni réussie. */
  enabled: boolean;
  canStepBack: boolean;
  onStepBack: () => void;
  /** Onglet « Réserver » : l'écran n'est jamais retiré, seul le bouton retour Android est intercepté. */
  embeddedInTab: boolean;
}) {
  const navigation = useNavigation();
  const [pendingAction, setPendingAction] = useState<NavigationAction | null>(null);

  usePreventRemove(enabled, ({ data }) => {
    if (data.action.type === 'RESET') {
      navigation.dispatch(data.action);
      return;
    }
    if (canStepBack && BACK_ACTION_TYPES.has(data.action.type)) {
      onStepBack();
      return;
    }
    setPendingAction(data.action);
  });

  useFocusEffect(
    useCallback(() => {
      if (!embeddedInTab || !canStepBack) return undefined;
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        onStepBack();
        return true;
      });
      return () => subscription.remove();
    }, [embeddedInTab, canStepBack, onStepBack]),
  );

  const stay = useCallback(() => setPendingAction(null), []);

  const leave = useCallback(() => {
    const action = pendingAction;
    setPendingAction(null);
    if (action) navigation.dispatch(action);
  }, [navigation, pendingAction]);

  return { confirmVisible: pendingAction !== null, stay, leave };
}
