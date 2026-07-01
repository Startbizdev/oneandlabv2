import { ActionSheetIOS, Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type ConversationRowAction = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

function confirmDelete(onDelete: () => void) {
  Alert.alert('Supprimer la conversation', 'Cette action est irréversible.', [
    { text: 'Annuler', style: 'cancel' },
    {
      text: 'Supprimer',
      style: 'destructive',
      onPress: () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onDelete();
      },
    },
  ]);
}

/** Menu contextuel long-press (style ChatGPT) — épingler, archiver, supprimer. */
export function showConversationRowActions(title: string, actions: ConversationRowAction[]) {
  if (actions.length === 0) return;

  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  const sheetActions = [...actions, { text: 'Annuler', style: 'cancel' as const }];
  const destructiveIndex = sheetActions.findIndex((a) => a.style === 'destructive');

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: title.length > 48 ? `${title.slice(0, 45)}…` : title,
        options: sheetActions.map((a) => a.text),
        cancelButtonIndex: sheetActions.length - 1,
        destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined,
      },
      (index) => {
        const picked = sheetActions[index];
        if (!picked || picked.style === 'cancel') return;
        if (picked.style === 'destructive' && picked.onPress) {
          confirmDelete(picked.onPress);
          return;
        }
        picked.onPress?.();
      },
    );
    return;
  }

  Alert.alert(
    title.length > 56 ? `${title.slice(0, 53)}…` : title,
    undefined,
    sheetActions.map((action) => ({
      text: action.text,
      style: action.style,
      onPress:
        action.style === 'destructive' && action.onPress
          ? () => confirmDelete(action.onPress!)
          : action.onPress,
    })),
  );
}
