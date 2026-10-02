import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { create } from 'zustand';

/** Hauteur native : ajustée au contenu, ou paliers fixes (fractions de l'écran, ordre croissant). */
export type SheetDetents = 'fitToContents' | number[];

export type SheetEntry = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  content: ReactNode;
  footer?: ReactNode;
  contentStyle?: ViewStyle;
  disableScroll: boolean;
  dismissible: boolean;
  /** Figés à l'ouverture : Android n'applique pas un changement de paliers après la présentation. */
  detents: SheetDetents;
  /** Le parent a demandé la fermeture (`visible={false}`) : la route se retire d'elle-même. */
  closeRequested: boolean;
  /** Appelé une fois la route retirée, par geste natif ou à la demande du parent. */
  onRemoved: (byParent: boolean) => void;
};

type SheetState = {
  entries: Record<string, SheetEntry>;
};

export const useSheetStore = create<SheetState>(() => ({ entries: {} }));

/** Une `Modal` RN ne se présente pas par-dessus une sheet native iOS : attendre qu'aucune ne soit ouverte. */
export function useHasOpenSheet(): boolean {
  return useSheetStore((s) => Object.keys(s.entries).length > 0);
}

/** `'92%'` ou pixels → fractions de l'écran triées (Android : trois au plus) ; aucun palier → hauteur ajustée au contenu. */
export function snapPointsToDetents(
  snapPoints: readonly (string | number)[] | undefined,
  windowHeight: number,
): SheetDetents {
  if (!snapPoints?.length) return 'fitToContents';
  return snapPoints
    .map((p) => (typeof p === 'number' ? p / windowHeight : Number.parseFloat(p) / 100))
    .map((d) => Math.min(1, Math.max(0, d)))
    .sort((a, b) => a - b);
}

export function upsertSheet(id: string, entry: Omit<SheetEntry, 'closeRequested'>) {
  useSheetStore.setState((s) => {
    const current = s.entries[id];
    return {
      entries: {
        ...s.entries,
        [id]: {
          ...entry,
          detents: current?.detents ?? entry.detents,
          closeRequested: current?.closeRequested ?? false,
        },
      },
    };
  });
}

export function requestSheetClose(id: string) {
  const entry = useSheetStore.getState().entries[id];
  if (!entry || entry.closeRequested) return;
  useSheetStore.setState((s) => ({ entries: { ...s.entries, [id]: { ...entry, closeRequested: true } } }));
}

export function removeSheet(id: string) {
  useSheetStore.setState((s) => {
    const entries = { ...s.entries };
    delete entries[id];
    return { entries };
  });
}

export function getSheet(id: string): SheetEntry | undefined {
  return useSheetStore.getState().entries[id];
}

/**
 * Suite à donner quand la route de la sheet a disparu.
 * - `dismissed` : le parent voulait la fermer (`visible={false}`) → `onDismissed`.
 * - `closed` : fermée par geste, retour ou navigation alors que le parent la voulait ouverte → `onClose`.
 * - `reopen` : le parent l'a refermée puis rouverte avant la fin de la fermeture → nouvelle présentation.
 */
export type SheetRemovalOutcome = 'dismissed' | 'closed' | 'reopen';

export function sheetRemovalOutcome(byParent: boolean, visible: boolean): SheetRemovalOutcome {
  if (!visible) return 'dismissed';
  return byParent ? 'reopen' : 'closed';
}
