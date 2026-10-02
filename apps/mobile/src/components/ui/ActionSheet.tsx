import { useRef } from 'react';
import { ActionSheetIOS, Platform, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { create } from 'zustand';
import { ICON_STROKE_WIDTH, iconSize, spacing, useStyles } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { Button } from './Button';
import { SheetModal } from './SheetModal';

export type ActionSheetOption = { label: string; icon?: LucideIcon };

type ActionSheetRequest = {
  title: string;
  options: readonly ActionSheetOption[];
  resolve: (index: number | null) => void;
};

const useActionSheetStore = create<{ request: ActionSheetRequest | null; visible: boolean }>(() => ({
  request: null,
  visible: false,
}));

/**
 * Choix parmi plusieurs actions, « Annuler » toujours visible. Résout l'index choisi,
 * ou `null` si l'utilisateur annule. iOS : feuille native ; Android : `ActionSheetHost`.
 */
export function showActionSheet(title: string, options: readonly ActionSheetOption[]): Promise<number | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title, options: [...options.map((o) => o.label), 'Annuler'], cancelButtonIndex: options.length },
        (index) => resolve(index < options.length ? index : null),
      );
      return;
    }
    useActionSheetStore.getState().request?.resolve(null);
    useActionSheetStore.setState({ request: { title, options, resolve }, visible: true });
  });
}

/** Hôte unique des feuilles d'actions Android, monté dans `AppProviders`. */
export function ActionSheetHost() {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const { request, visible } = useActionSheetStore();
  const chosenRef = useRef<number | null>(null);

  const close = (index: number | null) => {
    chosenRef.current = index;
    useActionSheetStore.setState({ visible: false });
  };

  const settle = (index: number | null) => {
    chosenRef.current = null;
    request?.resolve(index);
    useActionSheetStore.setState({ request: null, visible: false });
  };

  if (!request) return null;

  return (
    <SheetModal
      visible={visible}
      title={request.title}
      onClose={() => settle(null)}
      onDismissed={() => settle(chosenRef.current)}
      footer={
        <Button title="Annuler" variant="ghost" size="lg" fullWidth onPress={() => close(null)} />
      }
    >
      <View style={styles.options}>
        {request.options.map(({ label, icon: Icon }, index) => (
          <Button
            key={label}
            title={label}
            variant="outline"
            size="lg"
            fullWidth
            leftIcon={Icon ? <Icon size={iconSize.md} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} /> : undefined}
            onPress={() => close(index)}
          />
        ))}
      </View>
    </SheetModal>
  );
}

function buildStyles() {
  return {
    options: { gap: spacing[2] },
  };
}
