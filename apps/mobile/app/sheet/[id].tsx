import { useCallback, useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { NativeSheetBody } from '@/components/ui/sheet/NativeSheetBody';
import { getSheet, useSheetStore } from '@/components/ui/sheet/sheet-store';

/** Sheet native (`presentation: 'formSheet'`) : contenu fourni par le `SheetModal` qui l'a ouverte. */
export default function SheetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const entry = useSheetStore((s) => s.entries[id]);
  const missing = !entry;
  const closeRequested = entry?.closeRequested ?? false;
  const dismissible = entry?.dismissible ?? true;
  const onBack = entry?.onBack;

  /** `goBack` de l'écran retire cette route précise, même si une autre sheet est déjà au-dessus. */
  useEffect(() => {
    if (!missing && !closeRequested) return;
    if (navigation.canGoBack()) navigation.goBack();
    else router.replace('/');
  }, [missing, closeRequested, navigation, router]);

  /** iOS : `gestureEnabled` suit `dismissible` après la présentation. Android l'ignore (retour géré plus bas). */
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: dismissible });
  }, [dismissible, navigation]);

  useEffect(
    () => () => {
      const removed = getSheet(id);
      removed?.onRemoved(removed.closeRequested);
    },
    [id],
  );

  /** Android : retour matériel = étape précédente de la sheet, ou rien si elle ne se ferme pas. Sheet au sommet uniquement. */
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android' || (!onBack && dismissible)) return undefined;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        onBack?.();
        return true;
      });
      return () => sub.remove();
    }, [onBack, dismissible]),
  );

  return entry ? <NativeSheetBody entry={entry} /> : null;
}
