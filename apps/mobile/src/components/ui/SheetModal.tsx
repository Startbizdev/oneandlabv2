import { useCallback, useEffect, useId, useLayoutEffect, useReducer, useRef } from 'react';
import { Keyboard, useWindowDimensions, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigationReady } from '@/navigation/use-navigation-ready';
import {
  removeSheet,
  requestSheetClose,
  sheetRemovalOutcome,
  snapPointsToDetents,
  upsertSheet,
  type SheetEntry,
} from './sheet/sheet-store';

type SheetProps = Omit<SheetEntry, 'closeRequested' | 'onRemoved'>;

/** Ouverture haute pour fiches profil (intervenant RDV). */
export const PROFILE_SHEET_SNAP_POINTS: (string | number)[] = ['92%'];

interface BaseProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
  /** Actions en bas du scroll (après `children`). */
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
  /** `false` pendant un envoi : ni geste iOS, ni retour Android ne ferment la sheet. */
  dismissible?: boolean;
  /** Appelé quand la sheet est entièrement fermée après `visible={false}` (pas au geste → onClose). */
  onDismissed?: () => void;
}

/**
 * iOS ne redimensionne que le ScrollView de la sheet sur un palier fixe : un contenu sans scroll
 * (`disableScroll`, liste ou WebView interne) garde la hauteur ajustée au contenu.
 */
type Props = BaseProps &
  (
    | {
        disableScroll?: false;
        /** Paliers fixes (`'92%'` ou pixels), figés à l'ouverture, au lieu de la hauteur ajustée au contenu. */
        snapPoints?: (string | number)[];
      }
    | { disableScroll: true; snapPoints?: never }
  );

/**
 * Sheet native iOS / Android (`presentation: 'formSheet'`, route `app/sheet/[id].tsx`).
 * Le contenu reste déclaré ici et suit les re-rendus du parent ; `visible` reste la source de vérité.
 * Sheet ouverte, `router.back()` / `router.replace()` visent la route de la sheet : quitter l'écran avec
 * `navigation.goBack()`, ou naviguer dans `onDismissed`.
 * Android : la formSheet se ferme toujours au glissé ; `dismissible={false}` ne bloque que le bouton retour.
 */
export function SheetModal({
  visible,
  onClose,
  title,
  subtitle,
  onBack,
  children,
  footer,
  contentStyle,
  disableScroll = false,
  dismissible = true,
  onDismissed,
  snapPoints,
}: Props) {
  const router = useRouter();
  const { ready: navigationReady, canNavigate } = useNavigationReady();
  const { height } = useWindowDimensions();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const openRef = useRef(false);
  const mountedRef = useRef(false);
  const visibleRef = useRef(visible);
  const latestRef = useRef<SheetProps | null>(null);
  const callbacksRef = useRef({ onClose, onDismissed });
  const [removals, markRemoved] = useReducer((n: number) => n + 1, 0);

  const publish = useCallback(() => {
    if (!latestRef.current) return;
    upsertSheet(id, {
      ...latestRef.current,
      onRemoved: (byParent) => {
        openRef.current = false;
        removeSheet(id);
        Keyboard.dismiss();
        if (!mountedRef.current) return;
        const outcome = sheetRemovalOutcome(byParent, visibleRef.current);
        if (outcome === 'dismissed') {
          callbacksRef.current.onDismissed?.();
          return;
        }
        if (outcome === 'closed') callbacksRef.current.onClose();
        markRemoved();
      },
    });
  }, [id]);

  useLayoutEffect(() => {
    latestRef.current = {
      title,
      subtitle,
      onBack,
      content: children,
      footer,
      contentStyle,
      disableScroll,
      dismissible,
      detents: snapPointsToDetents(snapPoints, height),
    };
    callbacksRef.current = { onClose, onDismissed };
    visibleRef.current = visible;
    /** Fermeture en cours : le dernier contenu reste affiché pendant l'animation (pas de titre ni de corps vidés). */
    if (openRef.current && visible) publish();
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (openRef.current) requestSheetClose(id);
    };
  }, [id]);

  useEffect(() => {
    if (visible && !openRef.current) {
      if (!navigationReady || !canNavigate()) return;
      openRef.current = true;
      publish();
      router.push({ pathname: '/sheet/[id]', params: { id } });
    } else if (!visible && openRef.current) {
      requestSheetClose(id);
    }
  }, [visible, id, publish, router, navigationReady, canNavigate, removals]);

  return null;
}
