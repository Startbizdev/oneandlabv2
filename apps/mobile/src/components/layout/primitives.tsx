import type { ReactNode } from 'react';
import { Children, Fragment } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { spacing } from '@/theme';

/**
 * Primitives de layout sûres — garde-fous flexbox intégrés.
 *
 * Pourquoi : en React Native (Yoga), `flexShrink` vaut 0 par défaut et la largeur
 * intrinsèque d'un enfant flex sert de plancher. Sans `minWidth: 0` sur les colonnes
 * de contenu et `flexShrink: 0` sur les slots fixes, le contenu déborde, pousse les
 * actions hors de la carte ou les compresse.
 *
 * Ces primitives appliquent ces règles automatiquement. Les composants feature ne
 * doivent plus écrire `flexDirection: 'row'` à la main : ils composent ces primitives.
 *
 * - `Box`     : conteneur générique (padding/gap tokenisés), `minWidth: 0` garanti.
 * - `Stack`   : empilement vertical avec `gap` tokenisé (remplace les marginBottom ad hoc).
 * - `Row`     : ligne horizontale, `minWidth: 0` garanti sur le conteneur.
 * - `Cluster` : ligne `[ contenu flexible | actions à droite ]` — impossible à mal câbler.
 * - `Spacer`  : espace flexible (`flex: 1`) ou fixe.
 */

type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
type Justify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

const ALIGN_MAP: Record<Align, ViewStyle['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
};

const JUSTIFY_MAP: Record<Justify, ViewStyle['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
};

// ---------------------------------------------------------------------------
// Box
// ---------------------------------------------------------------------------

interface BoxProps {
  children?: ReactNode;
  /** Espace entre enfants (clé de spacing ou px). */
  gap?: number;
  padding?: number;
  paddingX?: number;
  paddingY?: number;
  flex?: number;
  style?: StyleProp<ViewStyle>;
}

export function Box({ children, gap, padding, paddingX, paddingY, flex, style }: BoxProps) {
  return (
    <View
      style={[
        // minWidth:0 systématique : un Box peut toujours rétrécir sous son contenu.
        { minWidth: 0 },
        gap != null && { gap },
        padding != null && { padding },
        paddingX != null && { paddingHorizontal: paddingX },
        paddingY != null && { paddingVertical: paddingY },
        flex != null && { flex },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Stack (vertical)
// ---------------------------------------------------------------------------

interface StackProps {
  children?: ReactNode;
  gap?: number;
  align?: Align;
  justify?: Justify;
  flex?: number;
  style?: StyleProp<ViewStyle>;
}

export function Stack({
  children,
  gap = spacing[3],
  align,
  justify,
  flex,
  style,
}: StackProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'column',
          minWidth: 0,
          gap,
        },
        align != null && { alignItems: ALIGN_MAP[align] },
        justify != null && { justifyContent: JUSTIFY_MAP[justify] },
        flex != null && { flex },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Row (horizontal)
// ---------------------------------------------------------------------------

interface RowProps {
  children?: ReactNode;
  gap?: number;
  align?: Align;
  justify?: Justify;
  /** Autorise le passage à la ligne (chips, tags…). */
  wrap?: boolean;
  flex?: number;
  style?: StyleProp<ViewStyle>;
}

export function Row({
  children,
  gap = spacing[2],
  align = 'center',
  justify,
  wrap = false,
  flex,
  style,
}: RowProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          // Garde-fou n°1 : le conteneur row peut rétrécir sous son contenu.
          minWidth: 0,
          alignItems: ALIGN_MAP[align],
          gap,
        },
        wrap && { flexWrap: 'wrap' },
        justify != null && { justifyContent: JUSTIFY_MAP[justify] },
        flex != null && { flex },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Cluster : [ contenu flexible | actions à droite ]
// ---------------------------------------------------------------------------

interface ClusterProps {
  /** Contenu principal — occupe l'espace et peut rétrécir/tronquer. */
  children: ReactNode;
  /** Slot d'actions à droite — taille fixe, ne rétrécit jamais. */
  actions?: ReactNode;
  /** Slot principal (icône/avatar) à gauche — taille fixe. */
  leading?: ReactNode;
  gap?: number;
  align?: Align;
  style?: StyleProp<ViewStyle>;
}

/**
 * Le pattern « icône | contenu | actions » fait correctement, par construction :
 * - leading / actions : `flexShrink: 0` (jamais compressés)
 * - contenu : `flex: 1` + `minWidth: 0` (rétrécit et tronque proprement)
 */
export function Cluster({
  children,
  actions,
  leading,
  gap = spacing[2.5],
  align = 'center',
  style,
}: ClusterProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          minWidth: 0,
          alignItems: ALIGN_MAP[align],
          gap,
        },
        style,
      ]}
    >
      {leading != null ? <View style={STATIC.slot}>{leading}</View> : null}
      <View style={STATIC.content}>{children}</View>
      {actions != null ? <View style={STATIC.actions}>{actions}</View> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Spacer
// ---------------------------------------------------------------------------

interface SpacerProps {
  /** Taille fixe en px. Sans `size`, le Spacer est flexible (`flex: 1`). */
  size?: number;
}

export function Spacer({ size }: SpacerProps) {
  if (size != null) {
    return <View style={{ width: size, height: size, flexShrink: 0 }} />;
  }
  return <View style={{ flex: 1, minWidth: 0 }} />;
}

const STATIC = {
  slot: { flexShrink: 0 } as ViewStyle,
  content: { flex: 1, minWidth: 0 } as ViewStyle,
  actions: {
    flexShrink: 0,
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  } as ViewStyle,
} as const;

/** Utilitaire pour répartir des séparateurs entre enfants si besoin futur. */
export function joinChildren(children: ReactNode, separator: ReactNode): ReactNode {
  const arr = Children.toArray(children);
  return arr.map((child, i) => (
    <Fragment key={i}>
      {i > 0 ? separator : null}
      {child}
    </Fragment>
  ));
}
