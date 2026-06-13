# Architecture styles — mobile Cary

## Stack

1. **Tokens** — `tokens.ts` (spacing, radius, iconSize), `typography.ts`, `colors.ts` (`AppColors`)
2. **Fragments** — `layout-styles.ts` (layoutRow, flexText, actionsSlot, hairlineTop…)
3. **Hook** — `useThemedStyles(buildStyles, context)` dans chaque composant React
4. **Couleurs dynamiques** — `useAppColors()` pour icônes et couleurs inline en JSX
5. **Primitives layout** — `Box`, `Row`, `Cluster`, `Stack`, `Spacer` (`components/layout/primitives.tsx`)
6. **Primitives composant** — `StackCard`, `ListRowShell`, `Button`, `IconActionButton`, `FullWidthSegmentBar`

## Hiérarchie obligatoire

```
Tokens → Fragments → Primitives layout → Primitives composant → Feature
```

Un composant feature **compose** les couches ci-dessus. Il n'écrit pas `flexDirection: 'row'` à la main.

| Besoin | Primitive |
|--------|-----------|
| Ligne horizontale | `Row` |
| `[leading \| contenu \| actions]` | `Cluster` ou `ListRowShell` |
| Empilement vertical + gap | `Stack` |
| Carte corps + footer actions séparés | `StackCard` |
| Bouton texte | `Button` |
| Bouton icône | `IconActionButton` |

## Factory

```tsx
function buildStyles(c: AppColors) {
  return {
    surface: {
      backgroundColor: c.surface,
    },
  };
}

export function MyScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'MyScreen');
  return (
    <Cluster
      leading={<Icon color={c.primary} />}
      actions={<Button title="Voir" size="sm" variant="ghost" />}
    >
      <Text numberOfLines={1}>Contenu long…</Text>
    </Cluster>
  );
}
```

## Règles de layout (React Native / Yoga)

| Rôle | Style imposé |
|------|----------------|
| Conteneur row | `minWidth: 0` (fourni par `Row` / `Cluster`) |
| Colonne contenu | `flex: 1` + `minWidth: 0` (fourni par `Cluster`) |
| Slot fixe (icône, bouton) | `flexShrink: 0` |
| Texte en row | `numberOfLines` explicite |

## Interdit

- `return StyleSheet.create(...)` dans `build*Styles` passé à `useThemedStyles`
- `new Proxy` + `getThemedStyles` dans du **nouveau** code
- Factory inline `(c) => buildStyles(c, flag)` — **deux factories nommées**
- `import { colors }` dans un composant React — utiliser `useAppColors()`
- `flexDirection: 'row'` brut hors primitives / `layout-styles.ts`
- Override agressif de `Button` — utiliser `IconActionButton`
- Corps riche + actions sur **la même row** — utiliser `StackCard` (2 rangées)

## Exceptions documentées

- `colors` statique : **uniquement** `navigation/screen-options.ts` et `navigation/header-layout.ts`

## Vérification (CI)

```bash
npm run verify -w @oneandlab/mobile
# équivalent :
npm run typecheck && npm run lint:layout && npm run lint:styles:strict && npm run lint
```

- `lint:layout` — ratchet : aucun `flex` / `row` sans `minWidth: 0`
- `lint:styles:strict` — pas de `colors.xxx` sans `useAppColors()`
- `eslint` — `no-static-colors-import` (error), `no-raw-flex-row` (error — hors primitives UI internes)
